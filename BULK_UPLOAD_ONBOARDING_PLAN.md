# Bulk Upload Onboarding Implementation Plan

## Overview
Add a bulk employee upload step to the organization onboarding flow, making it step 3 of 4 steps.

## Current State Review

### Bulk Import Implementation
**API** (`/api/employees/bulk-import/route.ts`)
- ✅ Robust CSV parsing using PapaParse with header normalization
- ✅ Comprehensive validation: email format, domain matching, duplicate detection (both existing & within CSV)
- ✅ Two-pass transaction approach: creates employees first, then resolves manager relationships
- ✅ Proper error reporting with row numbers and field-specific messages
- ✅ Audit log creation for all imported employees
- ✅ Uses `getAuthenticatedUser()` to get organizationId automatically

**UI** (`employee-bulk-import-dialog.tsx`)
- ✅ Clean dialog with clear instructions and template download
- ✅ Drag-and-drop and file picker support
- ✅ Detailed error display with row/field information
- ✅ Success feedback with auto-close
- ✅ Shows required fields and validation rules upfront

### Current Onboarding Flow

**For NEW organizations (3 steps):**
1. Organization Setup (`/onboarding/organization`) - Updates org name & description
2. Departments (`/onboarding/departments`) - Creates departments
3. Employee Profile (`/onboarding/employee`) - Creates user's employee record, sets `onboarding_completed=true`

**For EXISTING organizations:**
- Skip directly to step 3 (employee profile only)
- Determined by `skip_to_employee_step` flag set during signup

**Key Logic:**
- `middleware.ts` - Routes users based on `onboarding_completed` and `skip_to_employee_step` flags
- `api/employees/route.ts` - Detects onboarding completion and marks both user and org as complete
- `api/auth/signup/route.ts` - Sets `skip_to_employee_step` if org already onboarded

## New Flow

**For NEW organizations (4 steps):**
1. Creating the organization → `/onboarding/organization`
2. Creating departments → `/onboarding/departments`
3. **Bulk upload employees (NEW, optional)** → `/onboarding/bulk-upload`
4. Create your employee profile → `/onboarding/employee`

**For EXISTING organizations:**
- No change - skip directly to step 4 (employee profile only)

## Impact Analysis

### ✅ Safe to Add
1. The bulk import dialog is already self-contained and reusable
2. The bulk import API uses `getAuthenticatedUser()` which works during onboarding
3. Validation already handles org domain checking and department resolution
4. The onboarding completion logic is only triggered in the final employee creation step
5. Adding a step between departments and employee profile won't break existing logic

### ⚠️ Considerations
1. Need to update all "Step X of 3" text to "Step X of 4"
2. Need to hide the new step for users joining existing orgs (`skip_to_employee_step=true`)
3. Skip functionality needs to be added to the bulk import step
4. The "Back" button navigation needs updating throughout
5. Employee page shows conditional step text - this logic needs updating

## Implementation Plan

### Phase 1: Extract Reusable Component

**Create:** `/src/components/employees/employee-bulk-import-form.tsx`
- Extract core upload logic from `EmployeeBulkImportDialog`
- Contains: instructions, template download, file upload area, error display, upload logic
- Props: `onSuccess: () => void`, `onCancel?: () => void`, `showInstructions?: boolean`
- Manages all state internally (file, errors, loading, etc.)

**Update:** `/src/components/employees/employee-bulk-import-dialog.tsx`
- Refactor to wrap `EmployeeBulkImportForm` in a Dialog component
- Pass through `onSuccess` prop
- Test that existing bulk import from employees page still works

### Phase 2: Create New Onboarding Page

**Create:** `/src/app/onboarding/bulk-upload/page.tsx`
- Full-page layout matching other onboarding pages
- Use `EmployeeBulkImportForm` component
- Header: "Bulk upload employees" with "Step 3 of 4"
- Add Skip button: "Skip for now"
  - Helper text: "You can always bulk upload employees later from the Employee Directory"
- Navigation:
  - Back button → `/onboarding/departments`
  - Skip or Success → `/onboarding/employee`
- Show loading state while checking for user/departments

### Phase 3: Update Existing Onboarding Pages

**Update:** `/src/app/onboarding/organization/page.tsx`
- Line 81: Change "Step 1 of 3" → "Step 1 of 4"

**Update:** `/src/app/onboarding/departments/page.tsx`
- Line 99: Change "Step 2 of 3" → "Step 2 of 4"
- Line 85: Change navigation from `/onboarding/employee` → `/onboarding/bulk-upload`

**Update:** `/src/app/onboarding/employee/page.tsx`
- Line 129: Update conditional step text:
  ```tsx
  {skipToEmployeeStep
    ? 'Set up your employee profile'
    : 'Step 4 of 4: Set up your employee profile'}
  ```
- Lines 204-211: Update Back button logic:
  - Only show Back button if NOT `skipToEmployeeStep`
  - If shown, navigate to `/onboarding/bulk-upload` instead of `/onboarding/departments`
  ```tsx
  {!skipToEmployeeStep && (
    <Button
      type="button"
      variant="outline"
      onClick={() => router.push('/onboarding/bulk-upload')}
    >
      Back
    </Button>
  )}
  ```

**Update:** `/src/middleware.ts`
- No changes needed (already handles any `/onboarding/*` path)

### Phase 4: Testing

**Test Cases:**
1. ✅ Full onboarding flow for new organization (all 4 steps)
2. ✅ Onboarding flow for 2nd+ user (should skip directly to step 4)
3. ✅ Skip functionality on bulk upload step
4. ✅ Back button navigation through all steps
5. ✅ Forward navigation through all steps
6. ✅ Bulk upload with valid CSV file
7. ✅ Bulk upload with invalid CSV file (validation errors)
8. ✅ Bulk upload with duplicate emails
9. ✅ Bulk upload with non-existent departments
10. ✅ Verify onboarding completion still works correctly
11. ✅ Verify user redirects work properly after onboarding
12. ✅ Existing employees page bulk import still works

## Design Decisions

### Skip Button UX
- Clear messaging: "Skip for now - you can bulk upload employees later from the Employee Directory"
- Skip navigates to `/onboarding/employee` (same as successful import)
- No data saved when skipping (just navigation)

### Navigation Flow
```
Organization (Step 1/4)
  ↓
Departments (Step 2/4)
  ↓
Bulk Upload (Step 3/4) [NEW - can skip]
  ↓
Employee Profile (Step 4/4 or no step number if skipToEmployeeStep)
  ↓
Main App (/search)
```

### Conditional Step Display
- New org users see "Step X of 4" on all pages
- 2nd+ users only see employee page with no step counter
- Matches existing pattern in current employee page

### Component Reusability
- Extract form logic to maintain single source of truth
- Both dialog and onboarding page use same component
- Any improvements benefit both use cases

## File Checklist

### Files to Create
- [ ] `/src/components/employees/employee-bulk-import-form.tsx`
- [ ] `/src/app/onboarding/bulk-upload/page.tsx`

### Files to Modify
- [ ] `/src/components/employees/employee-bulk-import-dialog.tsx`
- [ ] `/src/app/onboarding/organization/page.tsx`
- [ ] `/src/app/onboarding/departments/page.tsx`
- [ ] `/src/app/onboarding/employee/page.tsx`

### Files Requiring Testing
- [ ] `/src/app/(app)/employees/page.tsx` (verify bulk import still works)
- [ ] `/src/middleware.ts` (verify routing still works)
- [ ] `/src/app/api/employees/bulk-import/route.ts` (verify API still works during onboarding)

## Open Questions

1. **Should the bulk upload step show how many departments exist?**
   - Could help users decide if they want to upload now or skip

2. **Should we track if users skipped the bulk upload?**
   - Could be useful analytics, but not necessary for functionality

3. **Template customization:**
   - Should the CSV template show actual departments created in step 2?
   - Or keep it generic like the current template?

4. **Success message:**
   - After bulk upload, auto-advance to step 4 or require "Continue" click?
   - Current dialog auto-closes after 2 seconds
