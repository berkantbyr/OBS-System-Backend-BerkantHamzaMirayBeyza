# Scheduling Algorithm Documentation

## CSP Problem Definition

The course scheduling problem is modeled as a **Constraint Satisfaction Problem (CSP)** where:

- **Variables:** Course sections that need to be scheduled
- **Domains:** Available (classroom, time slot) pairs
- **Constraints:**
  1. No instructor double-booking
  2. No classroom double-booking
  3. No student schedule conflicts
  4. Classroom capacity >= section capacity
  5. Classroom features match course requirements

## Algorithm Explanation

### Backtracking with Heuristics

The algorithm uses **backtracking search** with the following heuristics:

1. **Variable Ordering:** Prioritize required courses, then by capacity (larger first)
2. **Value Ordering:** Prefer less-used classrooms, then larger capacity
3. **Constraint Propagation:** Check hard constraints before assignment

### Pseudocode

```
function solveCSP(sections, classrooms, timeSlots, preferences, enrollments):
    assignments = []
    usedSlots = {} // Track used slots for instructors, classrooms, students
    
    // Sort sections by priority
    sortedSections = sort(sections, priority: required > capacity)
    
    function backtrack(index):
        if index >= sortedSections.length:
            return true // All sections assigned
        
        section = sortedSections[index]
        
        // Get valid classrooms (capacity >= section capacity)
        validClassrooms = filter(classrooms, capacity >= section.capacity)
        sort(validClassrooms, by: usage, then capacity)
        
        for each classroom in validClassrooms:
            for each timeSlot in timeSlots:
                if checkHardConstraints(section, classroom, timeSlot, usedSlots):
                    // Assign
                    assignments.push({
                        sectionId: section.id,
                        classroomId: classroom.id,
                        dayOfWeek: timeSlot.day_of_week,
                        startTime: timeSlot.start_time,
                        endTime: timeSlot.end_time
                    })
                    
                    // Mark slots as used
                    markUsed(section, classroom, timeSlot, usedSlots)
                    
                    // Recursive call
                    if backtrack(index + 1):
                        return true
                    
                    // Backtrack
                    assignments.pop()
                    unmarkUsed(section, classroom, timeSlot, usedSlots)
        
        return false // No valid assignment found
    
    if backtrack(0):
        return {assignments, stats: calculateStats()}
    else:
        return null // No solution found
```

## Example Solution

### Input:
```javascript
sections = [
  {id: 's1', instructor_id: 'i1', capacity: 30, course: {is_required: true}},
  {id: 's2', instructor_id: 'i2', capacity: 25, course: {is_required: false}}
]

classrooms = [
  {id: 'c1', capacity: 40},
  {id: 'c2', capacity: 35}
]

timeSlots = [
  {day_of_week: 'monday', start_time: '09:00', end_time: '10:30'},
  {day_of_week: 'monday', start_time: '11:00', end_time: '12:30'}
]
```

### Output:
```javascript
{
  assignments: [
    {
      sectionId: 's1',
      classroomId: 'c1',
      dayOfWeek: 'monday',
      startTime: '09:00',
      endTime: '10:30'
    },
    {
      sectionId: 's2',
      classroomId: 'c2',
      dayOfWeek: 'monday',
      startTime: '11:00',
      endTime: '12:30'
    }
  ],
  stats: {
    totalSections: 2,
    assignedSections: 2,
    unassignedSections: 0,
    averageClassroomUsage: 1.0
  }
}
```

## Constraint Checking

### Hard Constraints

1. **Instructor Conflict:**
   ```javascript
   if (usedSlots[instructorId]?.has(slotKey)) return false;
   ```

2. **Classroom Conflict:**
   ```javascript
   if (usedSlots[classroomId]?.has(slotKey)) return false;
   ```

3. **Student Conflict:**
   ```javascript
   for (studentId in studentEnrollments) {
     if (studentEnrollments[studentId].includes(sectionId)) {
       if (usedSlots[studentId]?.has(slotKey)) return false;
     }
   }
   ```

4. **Capacity Constraint:**
   ```javascript
   if (classroom.capacity < section.capacity) return false;
   ```

## Performance Considerations

- **Time Complexity:** O(b^d) where b = branching factor, d = depth
- **Optimization:** Early constraint checking reduces search space
- **Heuristics:** Variable and value ordering improve efficiency

## Future Improvements

1. Soft constraints (instructor preferences)
2. Genetic algorithms for large problems
3. Simulated annealing for optimization
4. Parallel processing for multiple solutions

