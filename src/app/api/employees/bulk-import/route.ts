import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { employees, organizations, departments } from '../../../../../db/schema';
import { createAuditLog } from '@/lib/audit/service';
import { getAuthenticatedUser } from '@/lib/auth/user';
import { eq, and } from 'drizzle-orm';
import Papa from 'papaparse';

interface CSVRow {
  name: string;
  email: string;
  title: string;
  departmentName: string;
  managerEmail?: string;
  hireDate: string;
  salary?: string;
  status: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: ValidationError[];
  employees?: any[];
}

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await getAuthenticatedUser();

    // Get the CSV file content from the request body
    const body = await request.json();
    const { csvContent } = body;

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json(
        { error: 'No CSV content provided' },
        { status: 400 }
      );
    }

    // Parse CSV
    const parseResult = Papa.parse<CSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Normalize headers to match expected format
        const headerMap: Record<string, string> = {
          'Name': 'name',
          'Email': 'email',
          'Job Title': 'title',
          'Department': 'departmentName',
          'Manager Email': 'managerEmail',
          'Hire Date': 'hireDate',
          'Salary': 'salary',
          'Status': 'status',
        };
        return headerMap[header] || header;
      },
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: 'CSV parsing error',
          details: parseResult.errors.map(e => e.message)
        },
        { status: 400 }
      );
    }

    const rows = parseResult.data;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    // Fetch organization to validate email domains
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Fetch all departments for this organization
    const orgDepartments = await db
      .select()
      .from(departments)
      .where(eq(departments.organizationId, organizationId));

    const departmentMap = new Map(
      orgDepartments.map(dept => [dept.name.toLowerCase(), dept.id])
    );

    // Fetch existing employees to check for duplicates and resolve manager emails
    const existingEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.organizationId, organizationId));

    const existingEmailsSet = new Set(
      existingEmployees.map(emp => emp.email.toLowerCase())
    );

    // Build a set of emails from the CSV to check for duplicates within the file
    const csvEmailsSet = new Set<string>();
    const csvEmailsMap = new Map<string, number>(); // email -> row number

    const errors: ValidationError[] = [];
    const validRows: Array<{
      name: string;
      email: string;
      title: string;
      departmentId: string;
      managerEmail?: string | null; // Store manager email for second pass
      hireDate: Date;
      salary?: string | null;
      status: 'active' | 'inactive' | 'on_leave' | 'terminated';
    }> = [];

    // Validate each row
    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because index starts at 0 and we have a header row

      // Validate required fields
      if (!row.name || row.name.trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'Name',
          message: 'Name is required',
          value: row.name,
        });
      }

      if (!row.email || row.email.trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'Email',
          message: 'Email is required',
          value: row.email,
        });
      } else {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          errors.push({
            row: rowNumber,
            field: 'Email',
            message: 'Invalid email format',
            value: row.email,
          });
        } else {
          // Validate email domain
          const emailDomain = row.email.split('@')[1];
          if (emailDomain !== organization.domain) {
            errors.push({
              row: rowNumber,
              field: 'Email',
              message: `Email domain must match organization domain (@${organization.domain})`,
              value: row.email,
            });
          }

          // Check for duplicate emails in existing employees
          if (existingEmailsSet.has(row.email.toLowerCase())) {
            errors.push({
              row: rowNumber,
              field: 'Email',
              message: 'Employee with this email already exists',
              value: row.email,
            });
          }

          // Check for duplicate emails within the CSV
          if (csvEmailsSet.has(row.email.toLowerCase())) {
            errors.push({
              row: rowNumber,
              field: 'Email',
              message: `Duplicate email in CSV (also appears in row ${csvEmailsMap.get(row.email.toLowerCase())})`,
              value: row.email,
            });
          } else {
            csvEmailsSet.add(row.email.toLowerCase());
            csvEmailsMap.set(row.email.toLowerCase(), rowNumber);
          }
        }
      }

      if (!row.title || row.title.trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'Job Title',
          message: 'Job Title is required',
          value: row.title,
        });
      }

      if (!row.departmentName || row.departmentName.trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'Department',
          message: 'Department is required',
          value: row.departmentName,
        });
      } else {
        const departmentId = departmentMap.get(row.departmentName.toLowerCase());
        if (!departmentId) {
          errors.push({
            row: rowNumber,
            field: 'Department',
            message: `Department "${row.departmentName}" not found`,
            value: row.departmentName,
          });
        }
      }

      if (!row.hireDate || row.hireDate.trim() === '') {
        errors.push({
          row: rowNumber,
          field: 'Hire Date',
          message: 'Hire Date is required',
          value: row.hireDate,
        });
      } else {
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(row.hireDate)) {
          errors.push({
            row: rowNumber,
            field: 'Hire Date',
            message: 'Hire Date must be in YYYY-MM-DD format',
            value: row.hireDate,
          });
        } else {
          const date = new Date(row.hireDate);
          if (isNaN(date.getTime())) {
            errors.push({
              row: rowNumber,
              field: 'Hire Date',
              message: 'Invalid date',
              value: row.hireDate,
            });
          }
        }
      }

      // Validate status
      const validStatuses = ['active', 'inactive', 'on_leave', 'terminated'];
      const status = row.status?.toLowerCase() || 'active';
      if (!validStatuses.includes(status)) {
        errors.push({
          row: rowNumber,
          field: 'Status',
          message: `Status must be one of: ${validStatuses.join(', ')}`,
          value: row.status,
        });
      }

      // If no errors for this row, add to valid rows
      if (!errors.some(e => e.row === rowNumber)) {
        const departmentId = departmentMap.get(row.departmentName.toLowerCase())!;

        // For now, just validate that manager email exists somewhere (existing or in CSV)
        if (row.managerEmail && row.managerEmail.trim() !== '') {
          const managerEmail = row.managerEmail.trim().toLowerCase();
          const managerExistsInDb = existingEmployees.some(
            emp => emp.email.toLowerCase() === managerEmail
          );
          const managerExistsInCsv = csvEmailsSet.has(managerEmail);

          if (!managerExistsInDb && !managerExistsInCsv) {
            errors.push({
              row: rowNumber,
              field: 'Manager Email',
              message: `Manager with email "${row.managerEmail}" not found in existing employees or in this import`,
              value: row.managerEmail,
            });
            return; // Skip this row
          }
        }

        validRows.push({
          name: row.name.trim(),
          email: row.email.trim().toLowerCase(),
          title: row.title.trim(),
          departmentId,
          managerEmail: row.managerEmail && row.managerEmail.trim() !== ''
            ? row.managerEmail.trim().toLowerCase()
            : null,
          hireDate: new Date(row.hireDate),
          salary: row.salary && row.salary.trim() !== '' ? row.salary.trim() : null,
          status: status as 'active' | 'inactive' | 'on_leave' | 'terminated',
        });
      }
    });

    // If there are validation errors, return them
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          imported: 0,
          failed: rows.length,
          errors,
        },
        { status: 400 }
      );
    }

    // Execute the entire import within a transaction
    // This ensures that if anything fails, ALL changes are rolled back
    const result = await db.transaction(async (tx) => {
      // FIRST PASS: Insert all employees without manager relationships
      const createdEmployees = await tx
        .insert(employees)
        .values(
          validRows.map(row => ({
            name: row.name,
            email: row.email,
            title: row.title,
            departmentId: row.departmentId,
            managerId: null, // Will be set in second pass
            hireDate: row.hireDate,
            salary: row.salary,
            status: row.status,
            organizationId,
            userId: null,
          }))
        )
        .returning();

      // Create a map of email to employee ID for newly created employees
      const newEmployeeEmailMap = new Map(
        createdEmployees.map(emp => [emp.email.toLowerCase(), emp.id])
      );

      // Combine existing and new employees for manager resolution
      const allEmployees = [...existingEmployees, ...createdEmployees];
      const allEmployeeEmailMap = new Map(
        allEmployees.map(emp => [emp.email.toLowerCase(), emp.id])
      );

      // SECOND PASS: Update manager relationships
      const employeesWithManagers = validRows
        .filter(row => row.managerEmail)
        .map(row => {
          const employeeId = newEmployeeEmailMap.get(row.email);
          const managerId = allEmployeeEmailMap.get(row.managerEmail!);
          return { employeeId, managerId };
        })
        .filter(({ employeeId, managerId }) => employeeId && managerId);

      // Update each employee with their manager
      if (employeesWithManagers.length > 0) {
        await Promise.all(
          employeesWithManagers.map(({ employeeId, managerId }) =>
            tx
              .update(employees)
              .set({ managerId })
              .where(eq(employees.id, employeeId!))
          )
        );
      }

      // Create audit logs for each created employee (within the transaction)
      await Promise.all(
        createdEmployees.map(employee => {
          const originalRow = validRows.find(row => row.email === employee.email);
          const managerId = originalRow?.managerEmail
            ? allEmployeeEmailMap.get(originalRow.managerEmail)
            : null;

          return createAuditLog({
            entityType: 'employee',
            entityId: employee.id,
            action: 'created',
            organizationId,
            newValues: {
              name: employee.name,
              email: employee.email,
              title: employee.title,
              departmentId: employee.departmentId,
              managerId: managerId || null,
              hireDate: employee.hireDate,
              salary: employee.salary,
              status: employee.status,
              importMethod: 'csv_bulk_import',
            },
          });
        })
      );

      return {
        success: true,
        imported: createdEmployees.length,
        failed: 0,
        errors: [],
        employees: createdEmployees,
      } as ImportResult;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error importing employees:', error);

    return NextResponse.json(
      {
        error: 'Failed to import employees',
        details: error.message
      },
      { status: 500 }
    );
  }
}
