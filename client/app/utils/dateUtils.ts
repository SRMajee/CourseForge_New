import { isToday, isYesterday, isThisWeek, parseISO } from "date-fns";

export const groupCoursesByDate = (courses: any[]) => {
  const groups = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  courses.forEach((course) => {
    const date = parseISO(course.createdAt);
    if (isToday(date)) {
      // @ts-ignore
      groups.Today.push(course);
    } else if (isYesterday(date)) {
      // @ts-ignore
      groups.Yesterday.push(course);
    } else if (isThisWeek(date)) {
      // @ts-ignore
      groups["Previous 7 Days"].push(course);
    } else {
      // @ts-ignore
      groups.Older.push(course);
    }
  });

  return groups;
};
