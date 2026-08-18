export type Gender = 'male' | 'female' | 'other';
export type TermName = 'first' | 'second' | 'third';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type TranscriptStatus = 'draft' | 'finalized' | 'published' | 'printed';
export type FeeStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
export type GuardianRel    = 'mother' | 'father' | 'guardian' | 'grandparent' | 'sibling' | 'other';
export type WeekDay        = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface TeacherAttendance {
  id: string;
  teacherId: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface TeacherScheduleEntry {
  teacherId: string;
  day: WeekDay;
  periodKey: string;
  periodLabel: string;
  time: string;
  classId: string;
  className: string;
  subjectName: string;
  room: string;
}

export interface School {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  headTeacher: string;
  motto: string;
}

export interface AcademicYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Term {
  id: string;
  academicYearId: string;
  name: TermName;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface GradeLevel {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Class {
  id: string;
  gradeLevelId: string;
  gradeLevelName: string;
  name: string;
  capacity: number;
  room: string;
  classTeacherId: string;
  classTeacherName: string;
  enrolled: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  coefficient: number;
  credit_hours: number;
}

export interface StudentDocument {
  id: string;
  title: string;
  fileUrl: string;
  createdAt: string;
}

export interface Student {
  id: string;
  studentNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  classId: string;
  className: string;
  gradeLevelName: string;
  photoUrl?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  mobileNumber?: string;
  alternateMobileNumber?: string;
  siblingIds?: string[];
  guardianName: string;
  guardianPhone: string;
  guardianRelationship: GuardianRel;
  admissionDate: string;
  isActive: boolean;
  documents?: StudentDocument[];
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: Gender;
  subjects: string[];
  classAssigned?: string;
  qualification: string;
  joinDate: string;
  isActive: boolean;
  documents?: { id: string; title: string; fileUrl: string; createdAt: string }[];
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  classId: string;
  className: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface Mark {
  studentId: string;
  studentName: string;
  studentNumber: string;
  subjectId: string;
  subjectName: string;
  caScore: number;    // out of 40
  examScore: number;  // out of 60
  totalScore: number; // out of 100
  grade: string;
  remark: string;
}

export interface TranscriptEntry {
  subjectId: string;
  subjectName: string;
  termId: string;
  termName: TermName;
  academicYear: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  creditHours: number;
  grade: string;
  gradePoints: number;
  remark: string;
}

export interface Transcript {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  className: string;
  gradeLevelName: string;
  cumulativeGpa: number;
  totalCreditHours: number;
  totalQualityPoints: number;
  termsIncluded: number;
  status: TranscriptStatus;
  generatedAt: string | null;
  entries: TranscriptEntry[];
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string;
  paymentDate: string;
  receiptNumber: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  classId: string;
  className: string;
  feeName: string;
  academicYear: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: FeeStatus;
  dueDate: string;
  payments: Payment[];
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  feesCollected: number;
  feesPending: number;
  feesTotal: number;
}
