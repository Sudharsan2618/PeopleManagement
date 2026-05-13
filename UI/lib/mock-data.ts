// Types
export type UserRole = "admin" | "telecaller" | "spoc"

export type ProspectStatus =
  | "Pending"
  | "InProgress"
  | "Callback"
  | "Qualified"
  | "NotInterested"
  | "DNC"
  | "Enrolled"
  | "Archived"

export type CallOutcome =
  | "NotAnswered"
  | "Busy"
  | "WrongNumber"
  | "CallBack"
  | "NotInterested"
  | "DNC"
  | "LanguageBarrier"
  | "Interested"
  | "Qualified"
  | "EnrolledElsewhere"

export type CourseInterest = "CourseA" | "CourseB" | "CourseC" | "Unknown"

export type FollowUpStatus = "Pending" | "Completed" | "Overdue"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  mobile: string
  phone: string
  status: "Active" | "Inactive"
  isActive: boolean
  hubId?: string
  createdAt: string
  lastLoginAt?: Date
}

export interface Prospect {
  id: string
  name: string
  mobile: string
  email?: string
  location: string
  schoolLastAttended: string
  courseInterest: CourseInterest
  status: ProspectStatus
  assignedTo?: string
  assignedDate?: string
  source: string
  createdAt: string
  age?: number
  lastCallAt?: string
  callbackDateTime?: string
  hubId?: string
}

export interface CallAttempt {
  id: string
  prospectId: string
  telecallerId: string
  outcome: CallOutcome
  callbackDatetime?: string
  courseConfirmed?: CourseInterest
  notes?: string
  calledAt: string
}

export interface FieldReport {
  id: string
  spocId: string
  spocName: string
  reportDate: string
  areaLocation: string
  schoolsVisited: number
  coachingCentresVisited: number
  admissionCentresVisited: number
  brandingDone: boolean
  alumniOutreach: boolean
  corporateOutreach: boolean
  referralNetwork: boolean
  submittedAt?: string
  isDraft: boolean
}

export interface FollowUpTask {
  id: string
  sourceReportId: string
  assignedToRole: "Telecaller" | "spoc"
  assignedToUser?: string
  institutionName: string
  actionDescription: string
  followUpDate: string
  status: FollowUpStatus
  resolutionNote?: string
  createdAt: string
}

export interface Hub {
  id: string
  name: string
  city: string
  state: string
  address?: string
  isActive: boolean
}

export interface Course {
  id: string
  name: string
  code: string
  duration: string
  mode: "Online" | "Offline" | "Hybrid"
  fee: number
  status: "Active" | "Inactive"
}

export interface Notification {
  id: string
  type: "callback" | "assignment" | "followup" | "report" | "escalation" | "unreachable"
  message: string
  createdAt: string
  read: boolean
}

// Mock Hubs
export const mockHubs: Hub[] = [
  {
    id: "hub-1",
    name: "Chennai Central",
    city: "Chennai",
    state: "Tamil Nadu",
    address: "123 Anna Salai, Chennai",
    isActive: true,
  },
  {
    id: "hub-2",
    name: "Coimbatore Hub",
    city: "Coimbatore",
    state: "Tamil Nadu",
    address: "45 Avinashi Road, Coimbatore",
    isActive: true,
  },
  {
    id: "hub-3",
    name: "Madurai Hub",
    city: "Madurai",
    state: "Tamil Nadu",
    address: "78 TPK Road, Madurai",
    isActive: true,
  },
  {
    id: "hub-4",
    name: "Bangalore Hub",
    city: "Bangalore",
    state: "Karnataka",
    address: "90 MG Road, Bangalore",
    isActive: false,
  },
]

// Mock Users
export const mockUsers: User[] = [
  {
    id: "admin-1",
    name: "Rajesh Kumar",
    email: "admin@cems.edu",
    role: "admin",
    mobile: "9876543210",
    phone: "9876543210",
    status: "Active",
    isActive: true,
    hubId: "hub-1",
    createdAt: "2024-01-15",
    lastLoginAt: new Date("2026-04-22T09:00:00"),
  },
  {
    id: "tc-1",
    name: "Priya Sharma",
    email: "priya@cems.edu",
    role: "telecaller",
    mobile: "9876543211",
    phone: "9876543211",
    status: "Active",
    isActive: true,
    hubId: "hub-1",
    createdAt: "2024-02-01",
    lastLoginAt: new Date("2026-04-22T08:30:00"),
  },
  {
    id: "tc-2",
    name: "Amit Patel",
    email: "amit@cems.edu",
    role: "telecaller",
    mobile: "9876543212",
    phone: "9876543212",
    status: "Active",
    isActive: true,
    hubId: "hub-1",
    createdAt: "2024-02-05",
    lastLoginAt: new Date("2026-04-22T08:45:00"),
  },
  {
    id: "tc-3",
    name: "Sunita Reddy",
    email: "sunita@cems.edu",
    role: "telecaller",
    mobile: "9876543213",
    phone: "9876543213",
    status: "Active",
    isActive: true,
    hubId: "hub-2",
    createdAt: "2024-02-10",
    lastLoginAt: new Date("2026-04-21T17:00:00"),
  },
  {
    id: "spoc-1",
    name: "Vikram Singh",
    email: "vikram@cems.edu",
    role: "spoc",
    mobile: "9876543214",
    phone: "9876543214",
    status: "Active",
    isActive: true,
    hubId: "hub-1",
    createdAt: "2024-02-15",
    lastLoginAt: new Date("2026-04-22T07:00:00"),
  },
  {
    id: "spoc-2",
    name: "Meera Nair",
    email: "meera@cems.edu",
    role: "spoc",
    mobile: "9876543215",
    phone: "9876543215",
    status: "Active",
    isActive: true,
    hubId: "hub-2",
    createdAt: "2024-02-20",
    lastLoginAt: new Date("2026-04-22T07:30:00"),
  },
  {
    id: "tc-4",
    name: "Ravi Chandran",
    email: "ravi@cems.edu",
    role: "telecaller",
    mobile: "9876543216",
    phone: "9876543216",
    status: "Inactive",
    isActive: false,
    hubId: "hub-3",
    createdAt: "2024-03-01",
    lastLoginAt: new Date("2026-03-15T10:00:00"),
  },
]

// Mock Courses
export const mockCourses: Course[] = [
  {
    id: "course-1",
    name: "Bachelor of Computer Applications",
    code: "BCA",
    duration: "3 years",
    mode: "Offline",
    fee: 150000,
    status: "Active",
  },
  {
    id: "course-2",
    name: "Bachelor of Business Administration",
    code: "BBA",
    duration: "3 years",
    mode: "Hybrid",
    fee: 180000,
    status: "Active",
  },
  {
    id: "course-3",
    name: "Bachelor of Science in Data Science",
    code: "BSc-DS",
    duration: "3 years",
    mode: "Online",
    fee: 120000,
    status: "Active",
  },
]

// Generate mock prospects
export const mockProspects: Prospect[] = [
  {
    id: "p-1",
    name: "Arjun Mehta",
    mobile: "98765XXXX1",
    email: "arjun.m@email.com",
    location: "Chennai",
    schoolLastAttended: "DAV Public School",
    courseInterest: "CourseA",
    status: "Callback",
    assignedTo: "tc-1",
    assignedDate: "2026-04-22",
    source: "Website",
    createdAt: "2026-04-20",
    age: 18,
    callbackDateTime: "2026-04-22T10:30:00",
  },
  {
    id: "p-2",
    name: "Sneha Iyer",
    mobile: "98765XXXX2",
    location: "Coimbatore",
    schoolLastAttended: "St. Mary's Convent",
    courseInterest: "CourseB",
    status: "Pending",
    assignedTo: "tc-1",
    assignedDate: "2026-04-22",
    source: "Referral",
    createdAt: "2026-04-21",
    age: 17,
  },
  {
    id: "p-3",
    name: "Karthik Rajan",
    mobile: "98765XXXX3",
    location: "Madurai",
    schoolLastAttended: "Kendriya Vidyalaya",
    courseInterest: "Unknown",
    status: "Pending",
    assignedTo: "tc-1",
    assignedDate: "2026-04-22",
    source: "School Visit",
    createdAt: "2026-04-21",
    age: 18,
  },
  {
    id: "p-4",
    name: "Divya Krishnan",
    mobile: "98765XXXX4",
    location: "Trichy",
    schoolLastAttended: "Holy Cross School",
    courseInterest: "CourseC",
    status: "Qualified",
    assignedTo: "tc-1",
    assignedDate: "2026-04-21",
    source: "Walk-in",
    createdAt: "2026-04-19",
    age: 18,
    lastCallAt: "2026-04-21T14:30:00",
  },
  {
    id: "p-5",
    name: "Rahul Venkatesh",
    mobile: "98765XXXX5",
    location: "Salem",
    schoolLastAttended: "Government Higher Secondary",
    courseInterest: "CourseA",
    status: "NotInterested",
    assignedTo: "tc-1",
    assignedDate: "2026-04-21",
    source: "Advertisement",
    createdAt: "2026-04-18",
    age: 19,
    lastCallAt: "2026-04-21T11:00:00",
  },
  {
    id: "p-6",
    name: "Ananya Pillai",
    mobile: "98765XXXX6",
    location: "Pondicherry",
    schoolLastAttended: "Jawahar Navodaya",
    courseInterest: "CourseB",
    status: "InProgress",
    assignedTo: "tc-1",
    assignedDate: "2026-04-22",
    source: "Alumni Referral",
    createdAt: "2026-04-20",
    age: 18,
    lastCallAt: "2026-04-22T09:15:00",
  },
  {
    id: "p-7",
    name: "Vijay Kumar",
    mobile: "98765XXXX7",
    location: "Vellore",
    schoolLastAttended: "Vellore Public School",
    courseInterest: "Unknown",
    status: "Pending",
    assignedTo: "tc-2",
    assignedDate: "2026-04-22",
    source: "Coaching Centre",
    createdAt: "2026-04-21",
    age: 17,
  },
  {
    id: "p-8",
    name: "Lakshmi Narayanan",
    mobile: "98765XXXX8",
    location: "Erode",
    schoolLastAttended: "Bharathi Vidyalaya",
    courseInterest: "CourseC",
    status: "DNC",
    assignedTo: "tc-2",
    assignedDate: "2026-04-20",
    source: "Website",
    createdAt: "2026-04-17",
    age: 18,
    lastCallAt: "2026-04-20T16:45:00",
  },
]

// Generate more prospects for admin view
for (let i = 9; i <= 150; i++) {
  const statuses: ProspectStatus[] = ["Pending", "InProgress", "Callback", "Qualified", "NotInterested"]
  const courses: CourseInterest[] = ["CourseA", "CourseB", "CourseC", "Unknown"]
  const locations = ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Vellore", "Erode", "Tirunelveli"]
  const telecallers = ["tc-1", "tc-2", "tc-3", undefined]

  mockProspects.push({
    id: `p-${i}`,
    name: `Student ${i}`,
    mobile: `98765XX${String(i).padStart(3, "0")}`,
    location: locations[Math.floor(Math.random() * locations.length)],
    schoolLastAttended: `School ${i}`,
    courseInterest: courses[Math.floor(Math.random() * courses.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    assignedTo: telecallers[Math.floor(Math.random() * telecallers.length)],
    assignedDate: Math.random() > 0.3 ? "2026-04-22" : undefined,
    source: "Database Import",
    createdAt: "2026-04-15",
    age: 17 + Math.floor(Math.random() * 3),
  })
}

// Mock Call Attempts
export const mockCallAttempts: CallAttempt[] = [
  {
    id: "ca-1",
    prospectId: "p-1",
    telecallerId: "tc-1",
    outcome: "CallBack",
    callbackDatetime: "2026-04-22T10:30:00",
    notes: "Student is interested but needs to discuss with parents",
    calledAt: "2026-04-21T14:00:00",
  },
  {
    id: "ca-2",
    prospectId: "p-4",
    telecallerId: "tc-1",
    outcome: "Qualified",
    courseConfirmed: "CourseC",
    notes: "Ready for admission. Preferred batch: June 2026",
    calledAt: "2026-04-21T14:30:00",
  },
  {
    id: "ca-3",
    prospectId: "p-5",
    telecallerId: "tc-1",
    outcome: "NotInterested",
    notes: "Wants to pursue engineering instead",
    calledAt: "2026-04-21T11:00:00",
  },
  {
    id: "ca-4",
    prospectId: "p-6",
    telecallerId: "tc-1",
    outcome: "Interested",
    notes: "Interested in BBA, prefers offline mode",
    calledAt: "2026-04-22T09:15:00",
  },
]

// Mock Field Reports
export const mockFieldReports: FieldReport[] = [
  {
    id: "fr-1",
    spocId: "spoc-1",
    spocName: "Vikram Singh",
    reportDate: "2026-04-22",
    areaLocation: "Poonamallee",
    schoolsVisited: 3,
    coachingCentresVisited: 2,
    admissionCentresVisited: 1,
    brandingDone: true,
    alumniOutreach: false,
    corporateOutreach: false,
    referralNetwork: true,
    submittedAt: "2026-04-22T17:30:00",
    isDraft: false,
  },
  {
    id: "fr-2",
    spocId: "spoc-1",
    spocName: "Vikram Singh",
    reportDate: "2026-04-21",
    areaLocation: "Tambaram",
    schoolsVisited: 4,
    coachingCentresVisited: 1,
    admissionCentresVisited: 0,
    brandingDone: true,
    alumniOutreach: true,
    corporateOutreach: false,
    referralNetwork: false,
    submittedAt: "2026-04-21T18:00:00",
    isDraft: false,
  },
  {
    id: "fr-3",
    spocId: "spoc-2",
    spocName: "Meera Nair",
    reportDate: "2026-04-22",
    areaLocation: "Anna Nagar",
    schoolsVisited: 2,
    coachingCentresVisited: 3,
    admissionCentresVisited: 1,
    brandingDone: false,
    alumniOutreach: true,
    corporateOutreach: true,
    referralNetwork: false,
    submittedAt: "2026-04-22T16:45:00",
    isDraft: false,
  },
]

// Mock Follow-up Tasks
export const mockFollowUps: FollowUpTask[] = [
  {
    id: "fu-1",
    sourceReportId: "fr-1",
    assignedToRole: "Telecaller",
    assignedToUser: "tc-1",
    institutionName: "DAV Public School, Poonamallee",
    actionDescription: "Call the principal for career fair date confirmation",
    followUpDate: "2026-04-23",
    status: "Pending",
    createdAt: "2026-04-22T17:30:00",
  },
  {
    id: "fu-2",
    sourceReportId: "fr-1",
    assignedToRole: "spoc",
    assignedToUser: "spoc-1",
    institutionName: "Brilliant Coaching Centre",
    actionDescription: "Deliver updated brochures",
    followUpDate: "2026-04-24",
    status: "Pending",
    createdAt: "2026-04-22T17:30:00",
  },
  {
    id: "fu-3",
    sourceReportId: "fr-2",
    assignedToRole: "Telecaller",
    assignedToUser: "tc-2",
    institutionName: "St. Thomas School",
    actionDescription: "Schedule presentation for Class 12 students",
    followUpDate: "2026-04-22",
    status: "Overdue",
    createdAt: "2026-04-21T18:00:00",
  },
  {
    id: "fu-4",
    sourceReportId: "fr-2",
    assignedToRole: "spoc",
    assignedToUser: "spoc-1",
    institutionName: "Excellence Academy",
    actionDescription: "Collect student database from coordinator",
    followUpDate: "2026-04-21",
    status: "Completed",
    resolutionNote: "Received 45 student contacts",
    createdAt: "2026-04-21T18:00:00",
  },
]

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: "n-1",
    type: "callback",
    message: "Callback due for Arjun Mehta at 10:30 AM",
    createdAt: "2026-04-22T10:15:00",
    read: false,
  },
  {
    id: "n-2",
    type: "assignment",
    message: "85 new prospects assigned for today",
    createdAt: "2026-04-22T08:00:00",
    read: true,
  },
  {
    id: "n-3",
    type: "followup",
    message: "New follow-up task: DAV Public School, Poonamallee",
    createdAt: "2026-04-22T17:30:00",
    read: false,
  },
  {
    id: "n-4",
    type: "report",
    message: "Vikram Singh submitted today's field report",
    createdAt: "2026-04-22T17:30:00",
    read: false,
  },
  {
    id: "n-5",
    type: "unreachable",
    message: "Prospect Ravi Kumar unreachable for 3 days",
    createdAt: "2026-04-22T09:00:00",
    read: true,
  },
]

// Dashboard Statistics
export const telecallerStats = {
  todaysProspects: 85,
  called: 23,
  pending: 62,
  callbacksDue: 5,
  qualified: 3,
}

export const spocStats = {
  todayDate: "2026-04-22",
  reportsSubmitted: 18,
  pendingFollowups: 4,
  telecallerFollowupsRaised: 2,
}

export const adminStats = {
  totalProspects: 2456,
  assignedToday: 340,
  callsMadeToday: 287,
  qualifiedToday: 24,
  fieldReportsToday: 5,
  followupsPending: 32,
}

// Helper to get current user (for auth simulation)
export function getCurrentUser(role: UserRole): User | undefined {
  return mockUsers.find((u) => u.role === role)
}

// Helper to get prospects for a telecaller
export function getProspectsForTelecaller(telecallerId: string): Prospect[] {
  return mockProspects.filter((p) => p.assignedTo === telecallerId && p.assignedDate === "2026-04-22")
}

// Helper to get call history for a prospect
export function getCallHistory(prospectId: string): CallAttempt[] {
  return mockCallAttempts.filter((ca) => ca.prospectId === prospectId)
}

// Helper to get follow-ups for a user
export function getFollowUpsForUser(userId: string): FollowUpTask[] {
  return mockFollowUps.filter((fu) => fu.assignedToUser === userId)
}

// Helper to get field reports for a spoc
export function getFieldReportsForspoc(spocId: string): FieldReport[] {
  return mockFieldReports.filter((fr) => fr.spocId === spocId)
}

// Alias for mockCallAttempts (for backwards compatibility)
export const mockCallLogs = mockCallAttempts
