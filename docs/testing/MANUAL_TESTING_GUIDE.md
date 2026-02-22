# Manual Testing Guide - Volunteer Management Features

**Last Updated:** February 1, 2026
**Testing Phase:** Week 1 - Phase 2 Module Completion
**Tester:** Bryan Crockett

---

## Prerequisites

### Starting the Application

```bash
# Terminal 1 - Start Backend (localhost:3000)
cd backend
npm run dev

# Terminal 2 - Start Frontend (localhost:5173)
cd frontend
npm run dev

# Terminal 3 - Ensure PostgreSQL is running
# macOS: brew services list
# Linux: sudo systemctl status postgresql
```

### Test Account
- Email: test@example.com
- Password: password123
- Role: Admin (full access)

---

## Test Suite 1: Volunteer Calendar Component

### Location
Navigate to: **Volunteers** → Select any volunteer → **Calendar Tab**

### Test Cases

#### TC1.1: Calendar Rendering
- [ ] **Pass/Fail**: Calendar displays current month and year
- [ ] **Pass/Fail**: All 7 day headers visible (Sun-Sat)
- [ ] **Pass/Fail**: Today's date is highlighted (blue border)
- [ ] **Pass/Fail**: Availability status shows correctly (green/yellow/red badge)

**Expected:** Calendar grid shows 6 rows × 7 columns with proper date alignment

#### TC1.2: Navigation Controls
- [ ] **Pass/Fail**: Previous month button (◀) works correctly
- [ ] **Pass/Fail**: Next month button (▶) works correctly
- [ ] **Pass/Fail**: "Today" button returns to current month
- [ ] **Pass/Fail**: Month/year updates in header after navigation

**Steps:**
1. Click previous month button 3 times
2. Note the displayed month
3. Click "Today" button
4. Verify it returns to current month

#### TC1.3: Assignment Display
- [ ] **Pass/Fail**: Assignments appear on correct dates
- [ ] **Pass/Fail**: Assignment name/title is visible
- [ ] **Pass/Fail**: Status colors match (green=completed, blue=in progress, gray=scheduled, red=cancelled)
- [ ] **Pass/Fail**: Shows "+X more" indicator when >2 assignments on same date

**Test Data Setup:**
- Create 3 assignments for the same date
- Verify only 2 show with "+1 more" indicator

#### TC1.4: Date Click Interaction
- [ ] **Pass/Fail**: Clicking date with assignments shows detail panel
- [ ] **Pass/Fail**: Detail panel displays all assignments for that date
- [ ] **Pass/Fail**: Close button (✕) dismisses detail panel
- [ ] **Pass/Fail**: Clicking empty date does nothing (no panel)

#### TC1.5: Status Legend
- [ ] **Pass/Fail**: Legend shows all 4 status types at bottom
- [ ] **Pass/Fail**: Colors match assignment indicators

**Bug Report Template:**
```
Issue: [Description]
Location: Calendar Tab
Steps to Reproduce:
1.
2.
Expected:
Actual:
Screenshot: [if applicable]
```

---

## Test Suite 2: Time Tracker Component

### Location
Navigate to: **Volunteers** → Select any volunteer → **Time Tracker Tab**

### Test Cases

#### TC2.1: Display and Layout
- [ ] **Pass/Fail**: Total hours logged displays correctly
- [ ] **Pass/Fail**: Volunteer name shows in header
- [ ] **Pass/Fail**: Active Assignments section visible
- [ ] **Pass/Fail**: Quick Actions section visible

#### TC2.2: Live Timer Functionality
- [ ] **Pass/Fail**: "Start Timer" button exists for active assignments
- [ ] **Pass/Fail**: Clicking Start Timer displays timer (00:00:00 format)
- [ ] **Pass/Fail**: Timer counts up every second
- [ ] **Pass/Fail**: Timer displays "Timer Running" header
- [ ] **Pass/Fail**: Stop button appears when timer is running
- [ ] **Pass/Fail**: Clicking Stop saves hours and hides timer

**Performance Test:**
1. Start timer
2. Let run for 2 minutes
3. Stop timer
4. Verify 0.03 hours (or close) added to assignment

#### TC2.3: Multiple Timer Prevention
- [ ] **Pass/Fail**: Starting second timer while first runs shows alert
- [ ] **Pass/Fail**: Alert message: "Please stop the current timer before starting a new one."
- [ ] **Pass/Fail**: Second timer does NOT start

**Steps:**
1. Start timer on Assignment A
2. Try to start timer on Assignment B
3. Verify alert appears
4. Verify only one timer runs

#### TC2.4: Manual Hours Entry
- [ ] **Pass/Fail**: Input field accepts decimal numbers (0.5, 2.5, etc.)
- [ ] **Pass/Fail**: "Log" button adds hours to assignment
- [ ] **Pass/Fail**: Input field clears after successful submission
- [ ] **Pass/Fail**: Validation rejects negative numbers
- [ ] **Pass/Fail**: Validation rejects zero (0)
- [ ] **Pass/Fail**: Validation rejects non-numeric input

**Test Values:**
- Valid: 0.25, 1, 2.5, 8, 10.75
- Invalid: -1, 0, abc, empty

#### TC2.5: Assignment Display
- [ ] **Pass/Fail**: Shows only in_progress and scheduled assignments
- [ ] **Pass/Fail**: Completed assignments appear in "Recently Completed"
- [ ] **Pass/Fail**: Cancelled assignments do NOT appear in active section
- [ ] **Pass/Fail**: Assignment role displays (if set)
- [ ] **Pass/Fail**: Date range displays correctly

#### TC2.6: Recently Completed Section
- [ ] **Pass/Fail**: Section appears if completed assignments exist
- [ ] **Pass/Fail**: Shows up to 5 most recent completed assignments
- [ ] **Pass/Fail**: Displays hours logged per assignment
- [ ] **Pass/Fail**: Shows assignment date

---

## Test Suite 3: Volunteer Dashboard Widget

### Location
Navigate to: **Dashboard** (main page after login)

### Test Cases

#### TC3.1: Widget Display
- [ ] **Pass/Fail**: "Volunteer Overview" widget visible on dashboard
- [ ] **Pass/Fail**: Stats grid shows 4 cards (Total, Available, Limited, Unavailable)
- [ ] **Pass/Fail**: Numbers display correctly for each category
- [ ] **Pass/Fail**: Total Hours Logged section visible with large number

#### TC3.2: Statistics Accuracy
- [ ] **Pass/Fail**: Total count matches volunteer list count
- [ ] **Pass/Fail**: Available count matches volunteers with "available" status
- [ ] **Pass/Fail**: Total hours matches sum of all volunteer hours

**Verification:**
1. Go to Volunteers list
2. Count total volunteers
3. Return to Dashboard
4. Verify widget total matches count

#### TC3.3: Top Volunteers List
- [ ] **Pass/Fail**: Shows top 5 volunteers by hours
- [ ] **Pass/Fail**: Ranking numbers (1-5) display correctly
- [ ] **Pass/Fail**: Names display correctly
- [ ] **Pass/Fail**: Hours logged show with "h" suffix
- [ ] **Pass/Fail**: Availability status badge shows correct color
- [ ] **Pass/Fail**: Skills display (first 2) or "No skills listed"

#### TC3.4: Navigation
- [ ] **Pass/Fail**: "View All →" navigates to /volunteers
- [ ] **Pass/Fail**: Clicking volunteer card navigates to detail page
- [ ] **Pass/Fail**: "Add Volunteer" button navigates to create form
- [ ] **Pass/Fail**: "New Assignment" button navigates to assignment form

#### TC3.5: Availability Breakdown
- [ ] **Pass/Fail**: Progress bar displays at bottom
- [ ] **Pass/Fail**: Bar segments colored correctly (green/yellow/red)
- [ ] **Pass/Fail**: Percentages displayed below bar
- [ ] **Pass/Fail**: Percentages sum to 100%

---

## Test Suite 4: CRUD Operations - Volunteers

### Create (C)

#### TC4.1: Volunteer Creation
- [ ] **Pass/Fail**: Navigate to Volunteers → "New Volunteer" button
- [ ] **Pass/Fail**: Form displays all required fields
- [ ] **Pass/Fail**: Contact dropdown populated with contacts
- [ ] **Pass/Fail**: Skills can be added (comma-separated)
- [ ] **Pass/Fail**: Availability status dropdown works
- [ ] **Pass/Fail**: Background check status dropdown works
- [ ] **Pass/Fail**: Date pickers work for check dates
- [ ] **Pass/Fail**: Emergency contact fields accept input
- [ ] **Pass/Fail**: Form validation prevents empty required fields
- [ ] **Pass/Fail**: Success message after creation
- [ ] **Pass/Fail**: Redirects to volunteer list or detail page

**Test Data:**
```
Contact: [Select existing contact]
Skills: Event Planning, Fundraising, Communications
Availability: Available
Max Hours/Week: 20
Background Check Status: Approved
Background Check Date: [Today]
Background Check Expiry: [One year from today]
Emergency Contact Name: Jane Doe
Emergency Contact Phone: 555-1234
Emergency Contact Relationship: Spouse
```

### Read (R)

#### TC4.2: Volunteer List View
- [ ] **Pass/Fail**: List displays all volunteers
- [ ] **Pass/Fail**: Shows name, skills, availability status, hours
- [ ] **Pass/Fail**: Pagination controls visible (if >20 volunteers)
- [ ] **Pass/Fail**: Search box functional
- [ ] **Pass/Fail**: Filter by availability status works
- [ ] **Pass/Fail**: Filter by skills works
- [ ] **Pass/Fail**: Clicking row navigates to detail page

#### TC4.3: Volunteer Detail View
- [ ] **Pass/Fail**: All volunteer information displays
- [ ] **Pass/Fail**: Contact information section complete
- [ ] **Pass/Fail**: Skills display as badges
- [ ] **Pass/Fail**: Availability section shows status and notes
- [ ] **Pass/Fail**: Background check info displays
- [ ] **Pass/Fail**: Emergency contact info displays (if set)
- [ ] **Pass/Fail**: Four tabs visible (Info, Assignments, Calendar, Time Tracker)

### Update (U)

#### TC4.4: Volunteer Editing
- [ ] **Pass/Fail**: "Edit Volunteer" button visible on detail page
- [ ] **Pass/Fail**: Form pre-populated with current data
- [ ] **Pass/Fail**: All fields editable
- [ ] **Pass/Fail**: Changes save successfully
- [ ] **Pass/Fail**: Success message displays
- [ ] **Pass/Fail**: Detail page shows updated information
- [ ] **Pass/Fail**: List view shows updated information

**Test:**
1. Edit volunteer skills (add "Photography")
2. Change availability from "Available" to "Limited"
3. Save changes
4. Verify changes persist after page refresh

### Delete (D)

#### TC4.5: Volunteer Deletion
- [ ] **Pass/Fail**: Delete option available (button or menu)
- [ ] **Pass/Fail**: Confirmation dialog appears
- [ ] **Pass/Fail**: "Cancel" keeps volunteer
- [ ] **Pass/Fail**: "Confirm" removes volunteer
- [ ] **Pass/Fail**: Redirects to list after deletion
- [ ] **Pass/Fail**: Volunteer no longer in list
- [ ] **Pass/Fail**: Associated assignments handled appropriately

---

## Test Suite 5: Pagination, Search, and Filters

### Pagination

#### TC5.1: Volunteers List Pagination
- [ ] **Pass/Fail**: Shows 20 volunteers per page (default)
- [ ] **Pass/Fail**: Page numbers displayed correctly
- [ ] **Pass/Fail**: "Next" button advances page
- [ ] **Pass/Fail**: "Previous" button goes back
- [ ] **Pass/Fail**: Last page button disabled appropriately
- [ ] **Pass/Fail**: Page number indicates current page
- [ ] **Pass/Fail**: Pagination works with filters applied

**Setup:** Create 25+ volunteers to test pagination

### Search

#### TC5.2: Volunteer Search
- [ ] **Pass/Fail**: Search box accepts text input
- [ ] **Pass/Fail**: Searches name (first and last)
- [ ] **Pass/Fail**: Searches email
- [ ] **Pass/Fail**: Search is case-insensitive
- [ ] **Pass/Fail**: Results update as you type (or on Enter)
- [ ] **Pass/Fail**: "No results" message when no matches
- [ ] **Pass/Fail**: Clearing search shows all volunteers

**Test Queries:**
- Search: "John" → Should find "John Doe"
- Search: "doe" → Should find "John Doe"
- Search: "john@" → Should find by email
- Search: "xyz123" → Should show no results

### Filters

#### TC5.3: Availability Status Filter
- [ ] **Pass/Fail**: Filter dropdown includes all statuses
- [ ] **Pass/Fail**: Selecting "Available" shows only available volunteers
- [ ] **Pass/Fail**: Filter combines with search
- [ ] **Pass/Fail**: "Clear filters" button resets filter

#### TC5.4: Skills Filter
- [ ] **Pass/Fail**: Can select multiple skills
- [ ] **Pass/Fail**: Shows volunteers with ANY selected skill (OR logic)
- [ ] **Pass/Fail**: Works with other filters

#### TC5.5: Background Check Status Filter
- [ ] **Pass/Fail**: Filter includes all check statuses
- [ ] **Pass/Fail**: Filtering works correctly
- [ ] **Pass/Fail**: Combines with other filters

---

## Test Suite 6: Data Relationships

### Volunteer ↔ Contact Relationship

#### TC6.1: Contact Association
- [ ] **Pass/Fail**: Volunteer must have associated contact
- [ ] **Pass/Fail**: Contact info displays on volunteer detail
- [ ] **Pass/Fail**: Editing contact updates volunteer display
- [ ] **Pass/Fail**: Cannot delete contact with associated volunteer (or warning shown)

### Volunteer ↔ Assignment Relationship

#### TC6.2: Assignment Management
- [ ] **Pass/Fail**: Assignments display on volunteer detail
- [ ] **Pass/Fail**: Can create assignment from volunteer page
- [ ] **Pass/Fail**: Assignment shows volunteer name
- [ ] **Pass/Fail**: Deleting volunteer handles assignments appropriately

### Assignment ↔ Event/Task Relationship

#### TC6.3: Assignment Links
- [ ] **Pass/Fail**: Assignment can link to event
- [ ] **Pass/Fail**: Assignment can link to task
- [ ] **Pass/Fail**: Assignment can be general (no event/task)
- [ ] **Pass/Fail**: Event name displays in assignment list
- [ ] **Pass/Fail**: Task name displays in assignment list
- [ ] **Pass/Fail**: Clicking event/task name navigates (if implemented)

---

## Test Suite 7: Cross-Module Integration

### Dashboard Integration

#### TC7.1: Stats Update
- [ ] **Pass/Fail**: Creating volunteer increments dashboard total
- [ ] **Pass/Fail**: Changing availability updates dashboard counts
- [ ] **Pass/Fail**: Logging hours updates total hours on dashboard

### Calendar Integration

#### TC7.2: Assignment Sync
- [ ] **Pass/Fail**: Creating assignment shows on calendar
- [ ] **Pass/Fail**: Updating assignment date moves it on calendar
- [ ] **Pass/Fail**: Completing assignment changes color on calendar
- [ ] **Pass/Fail**: Deleting assignment removes from calendar

### Time Tracker Integration

#### TC7.3: Hours Sync
- [ ] **Pass/Fail**: Logging hours updates assignment hours
- [ ] **Pass/Fail**: Assignment hours update in assignments list
- [ ] **Pass/Fail**: Total hours update on volunteer detail
- [ ] **Pass/Fail**: Dashboard widget reflects new total

---

## Test Suite 8: Edge Cases and Error Handling

### Edge Cases

#### TC8.1: Empty States
- [ ] **Pass/Fail**: Volunteer list shows "No volunteers" message when empty
- [ ] **Pass/Fail**: Calendar shows no assignments gracefully
- [ ] **Pass/Fail**: Time tracker shows "No active assignments" when empty
- [ ] **Pass/Fail**: Widget shows zeros when no volunteers

#### TC8.2: Maximum Values
- [ ] **Pass/Fail**: Handles volunteer with 100+ hours logged
- [ ] **Pass/Fail**: Handles volunteer with 20+ skills
- [ ] **Pass/Fail**: Handles 10+ assignments on same date
- [ ] **Pass/Fail**: Long names don't break layout

#### TC8.3: Special Characters
- [ ] **Pass/Fail**: Names with apostrophes (O'Brien)
- [ ] **Pass/Fail**: Names with hyphens (Mary-Jane)
- [ ] **Pass/Fail**: International characters (José, François)
- [ ] **Pass/Fail**: Skills with special characters

### Error Handling

#### TC8.4: Network Errors
- [ ] **Pass/Fail**: Error message when backend is down
- [ ] **Pass/Fail**: Retry option available
- [ ] **Pass/Fail**: Loading indicators show during requests
- [ ] **Pass/Fail**: Timeout handling (slow connection)

#### TC8.5: Validation Errors
- [ ] **Pass/Fail**: Clear error messages for invalid input
- [ ] **Pass/Fail**: Error messages highlight affected fields
- [ ] **Pass/Fail**: Can correct and resubmit
- [ ] **Pass/Fail**: Multiple errors show simultaneously

---

## Test Suite 9: Browser Compatibility

### Desktop Browsers

#### TC9.1: Chrome/Chromium
- [ ] **Pass/Fail**: All features work in latest Chrome
- [ ] **Pass/Fail**: Layout displays correctly
- [ ] **Pass/Fail**: No console errors

#### TC9.2: Firefox
- [ ] **Pass/Fail**: All features work in latest Firefox
- [ ] **Pass/Fail**: Layout displays correctly
- [ ] **Pass/Fail**: No console errors

#### TC9.3: Safari (macOS)
- [ ] **Pass/Fail**: All features work in latest Safari
- [ ] **Pass/Fail**: Layout displays correctly
- [ ] **Pass/Fail**: Date pickers work correctly

### Mobile/Responsive

#### TC9.4: Mobile View (iOS/Android)
- [ ] **Pass/Fail**: Dashboard widget is responsive
- [ ] **Pass/Fail**: Calendar displays correctly on mobile
- [ ] **Pass/Fail**: Time tracker usable on mobile
- [ ] **Pass/Fail**: Touch interactions work

---

## Performance Testing

### Load Time

#### TC10.1: Page Load Performance
- [ ] **Pass/Fail**: Dashboard loads in <2 seconds
- [ ] **Pass/Fail**: Volunteer list loads in <2 seconds
- [ ] **Pass/Fail**: Volunteer detail loads in <1 second
- [ ] **Pass/Fail**: Calendar renders in <1 second

### Large Data Sets

#### TC10.2: Scale Testing
- [ ] **Pass/Fail**: List handles 100+ volunteers without lag
- [ ] **Pass/Fail**: Calendar handles 50+ assignments in month
- [ ] **Pass/Fail**: Pagination works smoothly with large dataset
- [ ] **Pass/Fail**: Search remains responsive with 100+ records

---

## Bug Tracking

### Critical Bugs (P0)
_Blocks core functionality, must fix before proceeding_

| ID | Component | Description | Status | Assigned |
|----|-----------|-------------|--------|----------|
|    |           |             |        |          |

### High Priority Bugs (P1)
_Significant impact, should fix soon_

| ID | Component | Description | Status | Assigned |
|----|-----------|-------------|--------|----------|
|    |           |             |        |          |

### Medium Priority Bugs (P2)
_Moderate impact, fix when possible_

| ID | Component | Description | Status | Assigned |
|----|-----------|-------------|--------|----------|
|    |           |             |        |          |

### Low Priority Bugs (P3)
_Minor impact, nice to fix_

| ID | Component | Description | Status | Assigned |
|----|-----------|-------------|--------|----------|
|    |           |             |        |          |

---

## Testing Summary

**Test Date:** _______________
**Tester:** _______________
**Build Version:** _______________

### Results Overview

| Test Suite | Total Tests | Passed | Failed | Skipped | Pass Rate |
|------------|-------------|--------|--------|---------|-----------|
| 1. Calendar | | | | | |
| 2. Time Tracker | | | | | |
| 3. Dashboard Widget | | | | | |
| 4. CRUD Operations | | | | | |
| 5. Pagination/Search | | | | | |
| 6. Data Relationships | | | | | |
| 7. Integration | | | | | |
| 8. Edge Cases | | | | | |
| 9. Browser Compat | | | | | |
| 10. Performance | | | | | |
| **TOTAL** | | | | | |

### Sign-Off

- [ ] All critical tests passing
- [ ] All high-priority tests passing
- [ ] Known issues documented
- [ ] Ready for next phase

**Tester Signature:** _______________ **Date:** _______________

---

## Notes

Use this section for general observations, suggestions, or issues that don't fit elsewhere:

```
[Your notes here]
```
