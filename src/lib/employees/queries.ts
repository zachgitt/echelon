import { db } from '../db';
import { employees, departments } from '../../../db/schema';
import { eq, and, or, ilike, sql, desc, asc, inArray } from 'drizzle-orm';
import type { EmployeeFilters, EmployeeWithRelations } from '../../types/employee';

export async function getEmployees(filters: EmployeeFilters = {}) {
  const {
    search,
    status,
    departmentId,
    page = 1,
    limit = 25,
    sortBy = 'name',
    sortOrder = 'asc',
  } = filters;

  // Build WHERE conditions
  const conditions = [];

  // Search across name, email, and title
  if (search && search.trim()) {
    conditions.push(
      or(
        ilike(employees.name, `%${search}%`),
        ilike(employees.email, `%${search}%`),
        ilike(employees.title, `%${search}%`)
      )
    );
  }

  // Filter by status
  if (status && status.length > 0) {
    conditions.push(inArray(employees.status, status));
  }

  // Filter by department
  if (departmentId && departmentId.length > 0) {
    conditions.push(inArray(employees.departmentId, departmentId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Determine sort column and order
  const sortColumn = {
    name: employees.name,
    title: employees.title,
    hireDate: employees.hireDate,
    status: employees.status,
  }[sortBy];

  const orderByClause = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(employees)
    .where(whereClause);

  const total = Number(count);
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  // Get employees with relationships
  const results = await db
    .select({
      id: employees.id,
      name: employees.name,
      title: employees.title,
      email: employees.email,
      departmentId: employees.departmentId,
      managerId: employees.managerId,
      hireDate: employees.hireDate,
      salary: employees.salary,
      status: employees.status,
      organizationId: employees.organizationId,
      userId: employees.userId,
      createdAt: employees.createdAt,
      updatedAt: employees.updatedAt,
      department: {
        id: departments.id,
        name: departments.name,
      },
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  // Fetch manager information for employees
  const employeeIds = results.map((r) => r.id);
  const managerIds = results
    .map((r) => r.managerId)
    .filter((id): id is string => id !== null);

  const managers =
    managerIds.length > 0
      ? await db
          .select({
            id: employees.id,
            name: employees.name,
          })
          .from(employees)
          .where(inArray(employees.id, managerIds))
      : [];

  const managerMap = new Map(managers.map((m) => [m.id, m]));

  // Combine results with manager info
  const employeesWithRelations: EmployeeWithRelations[] = results.map((result) => ({
    ...result,
    manager: result.managerId ? managerMap.get(result.managerId) || null : null,
  }));

  return {
    employees: employeesWithRelations,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

export async function getEmployeeById(id: string) {
  const result = await db
    .select({
      id: employees.id,
      name: employees.name,
      title: employees.title,
      email: employees.email,
      departmentId: employees.departmentId,
      managerId: employees.managerId,
      hireDate: employees.hireDate,
      salary: employees.salary,
      status: employees.status,
      organizationId: employees.organizationId,
      createdAt: employees.createdAt,
      updatedAt: employees.updatedAt,
      department: {
        id: departments.id,
        name: departments.name,
      },
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(employees.id, id))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const employee = result[0];

  // Fetch manager info if exists
  let manager = null;
  if (employee.managerId) {
    const managerResult = await db
      .select({
        id: employees.id,
        name: employees.name,
      })
      .from(employees)
      .where(eq(employees.id, employee.managerId))
      .limit(1);

    manager = managerResult[0] || null;
  }

  return {
    ...employee,
    manager,
  } as EmployeeWithRelations;
}

export async function getDepartments() {
  return db
    .select({
      id: departments.id,
      name: departments.name,
    })
    .from(departments)
    .orderBy(asc(departments.name));
}

export async function getActiveEmployees() {
  return db
    .select({
      id: employees.id,
      name: employees.name,
      title: employees.title,
    })
    .from(employees)
    .where(eq(employees.status, 'active'))
    .orderBy(asc(employees.name));
}
