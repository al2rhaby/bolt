/**
 * Simple store to manage teacher password across components
 */

let teacherPassword = 'Mkiomkio1.@';

export const getTeacherPassword = () => teacherPassword;

export const setTeacherPassword = (newPassword: string) => {
  teacherPassword = newPassword;
};