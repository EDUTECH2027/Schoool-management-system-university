export interface SubjectEntry {
  id: string;
  name: string;
  code: string;
}

export interface Translations {
  nav: {
    mainMenu: string; system: string; dashboard: string; students: string;
    classes: string; teachers: string; attendance: string; assessments: string;
    transcripts: string; fees: string; timetable: string; parents: string;
    settings: string; currentTerm: string;
    communication: string; announcements: string; emailAlerts: string; discussionForums: string;
    teacherPayment: string; certificates: string;
  };
  header: {
    dashboard: string; students: string; classes: string; teachers: string;
    attendance: string; assessments: string; transcripts: string; fees: string;
    timetable: string; parents: string; settings: string; search: string; headTeacher: string;
    announcements: string; emailAlerts: string; discussionForums: string;
    teacherPayment: string; certificates: string;
  };
  common: {
    search: string; add: string; save: string; edit: string; view: string;
    print: string; cancel: string; status: string; actions: string; all: string;
    male: string; female: string; active: string; inactive: string; total: string;
    name: string; class: string; grade: string; subject: string; term: string;
    position: string; saved: string; noResults: string;
    present: string; absent: string; late: string; excused: string;
    paid: string; partial: string; pending: string; overdue: string;
    waived: string; draft: string; finalized: string; published: string; printed: string;
    monday: string; tuesday: string; wednesday: string; thursday: string; friday: string; saturday: string;
  };
  dashboard: {
    welcomeBack: string; totalStudents: string; enrolledThisYear: string;
    teachers: string; activeStaff: string; classes: string; activeStreams: string;
    attendanceToday: string; presentToday: string; todaysAttendance: string;
    records: string; feeCollection: string; collected: string; pending: string;
    transcripts: string; absentToday: string; students: string;
    recentActivity: string; allPresent: string;
    studentDirectory: string; guardianPhone: string; noFeeRecord: string;
  };
  students: {
    searchPlaceholder: string; addStudent: string; allClasses: string;
    allGenders: string; studentsFound: string; totalStudents: string;
    male: string; female: string; activeStudents: string; admNo: string;
    gender: string; guardian: string; noStudents: string;
    profileTitle: string; editTitle: string; addTitle: string;
    personalInfo: string; schoolInfo: string; guardianInfo: string;
    dateOfBirth: string; admissionDate: string; relationship: string; address: string;
    firstName: string; lastName: string;
    required: string; studentAdded: string;
  };
  classes: {
    addClass: string; activeThisTerm: string; enrollment: string;
    boys: string; girls: string; classDetails: string; gradeLevel: string;
    classTeacher: string; room: string; enrolled: string; capacity: string;
    classOverview: string; studentsInClass: string; teacherDetails: string;
    noStudents: string; addTitle: string; classAdded: string; className: string;
    noClasses: string;
  };
  teachers: {
    addTeacher: string; activeTeachers: string; staffRegister: string;
    subjects: string; classAssigned: string; qualification: string;
    joinDate: string; none: string;
    overview: string; classesTeaching: string; attendanceRecord: string; schedule: string;
    periodsPerWeek: string; yearsOfService: string; free: string; noSchedule: string;
    addTitle: string; teacherAdded: string; professionalInfo: string;
    selectSubjects: string; noSubjectsSelected: string; optionalClass: string;
    editTitle: string; teacherUpdated: string;
    deleteTeacher: string; confirmDelete: string; cannotUndo: string; teacherDeleted: string;
  };
  attendance: {
    date: string; class: string; markAll: string;
    saveAttendance: string; students: string;
  };
  assessments: {
    class: string; subject: string; term: string; saveMarks: string;
    classAverage: string; passed: string; failed: string;
    caOutOf: string; examOutOf: string; totalOutOf: string;
    grade: string; remark: string;
  };
  transcripts: {
    preview: string; printTranscript: string;
  };
  fees: {
    totalBilled: string; collected: string; outstanding: string;
    recordPayment: string; billed: string; paid: string; balance: string;
    dueDate: string; paymentHistory: string; amountDue: string;
    amountPaid: string; collectedPct: string; noRecords: string; fee: string;
    addFeeRecord: string;
  };
  timetable: {
    weeklyTimetable: string; period: string; time: string;
    break: string; lunch: string;
    editPeriod: string; clearPeriod: string; apply: string;
    saveTimetable: string; timetableSaved: string;
    selectSubject: string; selectTeacher: string; empty: string; resetAll: string;
    downloadTimetable: string;
  };
  settings: {
    schoolInformation: string; saveChanges: string; gradingScale: string;
    minScore: string; maxScore: string; remark: string; schoolName: string;
    schoolCode: string; address: string; phone: string; email: string;
    headTeacher: string; motto: string;
    feeSchedule: string; installment: string; totalAmount: string; feeScheduleHint: string;
    subjects: string; subjectsHint: string; addSubject: string;
    subjectName: string; subjectCode: string; subjectCoefficient: string; subjectCreditHours: string; deleteSubject: string; noSubjects: string;
    classCreateValidation: string; invalidGradeLevel: string;
  };
  portal: {
    myProfile: string; myClass: string; markEntry: string; myAttendance: string;
    reportAbsence: string; behavior: string; salary: string; withdrawalRequest: string;
    myChildren: string; academicPerformance: string; feeBalance: string;
    myMarks: string; myTimetable: string; myAttendanceRecord: string;
    transcripts: string; studentBehavior: string; myFees: string;
  };
  userManagement: {
    title: string; createAccount: string; resetPassword: string;
    linkedEntity: string; role: string; accountCreated: string; passwordReset: string;
    createPortalAccounts: string; migrationSuccess: string; deleteUser: string;
    confirmDelete: string;
  };
}

export const en: Translations = {
  nav: {
    mainMenu: 'Main Menu', system: 'System', dashboard: 'Dashboard',
    students: 'Students', classes: 'Specialities', teachers: 'Teachers',
    attendance: 'Attendance', assessments: 'Assessments',
    transcripts: 'Transcripts', fees: 'Fees', timetable: 'Timetable',
    parents: 'Parents', settings: 'Settings', currentTerm: 'Current Semester',
    communication: 'Communication', announcements: 'Announcements', emailAlerts: 'Email Alerts', discussionForums: 'Discussion Forums',
    teacherPayment: 'Teacher Payment', certificates: 'Certificates',
  },
  header: {
    dashboard: 'Dashboard', students: 'Students', classes: 'Specialities',
    teachers: 'Teachers', attendance: 'Attendance', assessments: 'Assessments',
    transcripts: 'Transcripts', fees: 'Fees & Payments', timetable: 'Timetable',
    parents: 'Parents & Guardians', settings: 'Settings', search: 'Search...', headTeacher: 'Head Teacher',
    announcements: 'Announcements / Notices', emailAlerts: 'Email Alerts', discussionForums: 'Discussion Forums',
    teacherPayment: 'Teacher Payroll', certificates: 'Certificates & Attestations',
  },
  common: {
    search: 'Search', add: 'Add', save: 'Save', edit: 'Edit', view: 'View',
    print: 'Print', cancel: 'Cancel', status: 'Status', actions: 'Actions',
    all: 'All', male: 'Male', female: 'Female', active: 'Active',
    inactive: 'Inactive', total: 'Total', name: 'Name', class: 'Speciality',
    grade: 'Grade', subject: 'Course', term: 'Semester', position: 'Position',
    saved: 'Saved ✓', noResults: 'No results found.',
    present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused',
    paid: 'Paid', partial: 'Partial', pending: 'Pending', overdue: 'Overdue',
    waived: 'Waived', draft: 'Draft', finalized: 'Finalized',
    published: 'Published', printed: 'Printed',
    monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
    thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
  },
  dashboard: {
    welcomeBack: 'Welcome back,', totalStudents: 'Total Students',
    enrolledThisYear: 'enrolled this year', teachers: 'Teachers',
    activeStaff: 'active staff', classes: 'Specialities', activeStreams: 'active streams',
    attendanceToday: 'Attendance Today', presentToday: 'present today',
    todaysAttendance: "Today's Attendance", records: 'records',
    feeCollection: 'Fee Collection', collected: 'Collected', pending: 'Pending',
    transcripts: 'Transcripts', absentToday: 'Absent Today', students: 'students',
    recentActivity: 'Recent Activity', allPresent: 'All students present today!',
    studentDirectory: 'Student Directory', guardianPhone: 'Guardian Phone', noFeeRecord: 'No Record',
  },
  students: {
    searchPlaceholder: 'Search students...', addStudent: 'Add Student',
    allClasses: 'All Specialities', allGenders: 'All Genders',
    studentsFound: 'students found', totalStudents: 'Total',
    male: 'Male', female: 'Female', activeStudents: 'Active',
    admNo: 'Adm No.', gender: 'Gender', guardian: 'Guardian',
    noStudents: 'No students match your search.',
    profileTitle: 'Student Profile', editTitle: 'Edit Student', addTitle: 'Add New Student',
    personalInfo: 'Personal Information', schoolInfo: 'School Information',
    guardianInfo: 'Guardian Information', dateOfBirth: 'Date of Birth',
    admissionDate: 'Admission Date', relationship: 'Relationship', address: 'Address',
    firstName: 'First Name', lastName: 'Last Name',
    required: 'This field is required', studentAdded: 'Student added successfully!',
  },
  classes: {
    addClass: 'Add Speciality', activeThisTerm: 'specialities active this semester',
    enrollment: 'Enrollment', boys: 'Boys', girls: 'Girls',
    classDetails: 'Speciality Details', gradeLevel: 'Grade Level',
    classTeacher: 'Speciality Teacher', room: 'Room', enrolled: 'Enrolled',
    capacity: 'Capacity', classOverview: 'Speciality Overview',
    studentsInClass: 'Students in this speciality', teacherDetails: 'Teacher Details',
    noStudents: 'No students enrolled yet', addTitle: 'Add New Speciality',
    classAdded: 'Speciality added successfully!', className: 'Speciality Name',
    noClasses: 'No specialities yet',
  },
  teachers: {
    addTeacher: 'Add Teacher', activeTeachers: 'active teachers',
    staffRegister: 'Staff Register', subjects: 'Courses',
    classAssigned: 'Speciality Assigned', qualification: 'Qualification',
    joinDate: 'Join Date', none: '—',
    overview: 'Overview', classesTeaching: 'Specialities', attendanceRecord: 'Attendance',
    schedule: 'Timetable', periodsPerWeek: 'Periods / Week',
    yearsOfService: 'Years of Service', free: 'Free', noSchedule: 'No schedule available',
    addTitle: 'Add New Teacher', teacherAdded: 'Teacher added successfully!',
    professionalInfo: 'Professional Information',
    selectSubjects: 'Select courses taught', noSubjectsSelected: 'Select at least one course',
    optionalClass: 'Speciality Assigned (optional)',
    editTitle: 'Edit Teacher', teacherUpdated: 'Teacher updated successfully!',
    deleteTeacher: 'Delete Teacher',
    confirmDelete: 'Are you sure you want to delete',
    cannotUndo: 'This action cannot be undone.',
    teacherDeleted: 'Teacher deleted.',
  },
  attendance: {
    date: 'Date', class: 'Speciality', markAll: 'Mark All',
    saveAttendance: 'Save Attendance', students: 'students',
  },
  assessments: {
    class: 'Speciality', subject: 'Course', term: 'Semester', saveMarks: 'Save Marks',
    classAverage: 'Speciality Average', passed: 'Passed', failed: 'Failed',
    caOutOf: 'CA /40', examOutOf: 'Exam /60', totalOutOf: 'Total',
    grade: 'Grade', remark: 'Remark',
  },
  transcripts: {
    preview: 'Preview', printTranscript: 'Print Transcript',
  },
  fees: {
    totalBilled: 'Total Billed', collected: 'Collected', outstanding: 'Outstanding',
    recordPayment: 'Record Payment', billed: 'Billed', paid: 'Paid',
    balance: 'Balance', dueDate: 'Due Date', paymentHistory: 'Payment History',
    amountDue: 'Amount Due', amountPaid: 'Amount Paid',
    collectedPct: '% collected', noRecords: 'No records found.', fee: 'Fee',
    addFeeRecord: 'Add Fee Record',
  },
  timetable: {
    weeklyTimetable: 'Weekly Timetable', period: 'Period', time: 'Time',
    break: 'Break', lunch: 'Lunch',
    editPeriod: 'Edit Period', clearPeriod: 'Clear', apply: 'Apply',
    saveTimetable: 'Save Timetable', timetableSaved: 'Timetable saved!',
    selectSubject: 'Select a course', selectTeacher: 'Teacher (optional)',
    empty: 'Empty', resetAll: 'Reset All', downloadTimetable: 'Download PDF',
  },
  settings: {
    schoolInformation: 'School Information', saveChanges: 'Save Changes',
    gradingScale: 'Grading Scale', minScore: 'Min Score', maxScore: 'Max Score',
    remark: 'Remark', schoolName: 'School Name', schoolCode: 'School Code',
    address: 'Address', phone: 'Phone', email: 'Email',
    headTeacher: 'Head Teacher', motto: 'Motto',
    feeSchedule: 'Fee Payment Schedule', installment: 'Installment',
    totalAmount: 'Total', feeScheduleHint: 'Amounts must sum to 100,000 FCFA',
    subjects: 'Courses', subjectsHint: 'Manage courses used in the timetable and assessments',
    addSubject: 'Add Course', subjectName: 'Course Name', subjectCode: 'Code (e.g. MTH)', subjectCoefficient: 'Coefficient', subjectCreditHours: 'Credit Hours',
    deleteSubject: 'Delete course', noSubjects: 'No courses defined yet.',
    classCreateValidation: 'Name and grade level are required.',
    invalidGradeLevel: 'Selected grade level is invalid.',
  },
  portal: {
    myProfile: 'My Profile', myClass: 'My Speciality', markEntry: 'Mark Entry',
    myAttendance: 'My Attendance', reportAbsence: 'Report Absence',
    behavior: 'Behavior', salary: 'Salary', withdrawalRequest: 'Withdrawal Request',
    myChildren: 'My Children', academicPerformance: 'Academic Performance',
    feeBalance: 'Fee Balance', myMarks: 'My Marks', myTimetable: 'My Timetable',
    myAttendanceRecord: 'My Attendance', transcripts: 'Transcripts',
    studentBehavior: 'Student Behavior', myFees: 'My Fees',
  },
  userManagement: {
    title: 'User Management', createAccount: 'Create Account', resetPassword: 'Reset Password',
    linkedEntity: 'Linked To', role: 'Role', accountCreated: 'Account created successfully',
    passwordReset: 'Password has been reset', createPortalAccounts: 'Auto-Create Portal Accounts',
    migrationSuccess: 'Portal accounts created successfully', deleteUser: 'Delete User',
    confirmDelete: 'Are you sure you want to delete this account?',
  },
};

export const fr: Translations = {
  nav: {
    mainMenu: 'Menu Principal', system: 'Système', dashboard: 'Tableau de bord',
    students: 'Élèves', classes: 'Spécialités', teachers: 'Enseignants',
    attendance: 'Présences', assessments: 'Évaluations',
    transcripts: 'Relevés de notes', fees: 'Frais', timetable: 'Emploi du temps',
    parents: 'Parents', settings: 'Paramètres', currentTerm: 'Semestre en cours',
    communication: 'Communication', announcements: 'Annonces', emailAlerts: 'Alertes Email', discussionForums: 'Forums de Discussion',
    teacherPayment: 'Paiement Enseignants', certificates: 'Certificats',
  },
  header: {
    dashboard: 'Tableau de bord', students: 'Élèves', classes: 'Spécialités',
    teachers: 'Enseignants', attendance: 'Présences', assessments: 'Évaluations',
    transcripts: 'Relevés de notes', fees: 'Frais & Paiements',
    timetable: 'Emploi du temps', parents: 'Parents & Tuteurs',
    settings: 'Paramètres', search: 'Rechercher...', headTeacher: 'Directeur(trice)',
    announcements: 'Annonces / Avis', emailAlerts: 'Alertes Email', discussionForums: 'Forums de Discussion',
    teacherPayment: 'Paie des Enseignants', certificates: 'Certificats & Attestations',
  },
  common: {
    search: 'Rechercher', add: 'Ajouter', save: 'Enregistrer', edit: 'Modifier',
    view: 'Voir', print: 'Imprimer', cancel: 'Annuler', status: 'Statut',
    actions: 'Actions', all: 'Tous', male: 'Masculin', female: 'Féminin',
    active: 'Actif', inactive: 'Inactif', total: 'Total', name: 'Nom',
    class: 'Spécialité', grade: 'Note', subject: 'Cours', term: 'Semestre',
    position: 'Rang', saved: 'Enregistré ✓', noResults: 'Aucun résultat.',
    present: 'Présent', absent: 'Absent', late: 'En retard', excused: 'Excusé',
    paid: 'Payé', partial: 'Partiel', pending: 'En attente', overdue: 'Échu',
    waived: 'Exonéré', draft: 'Brouillon', finalized: 'Finalisé',
    published: 'Publié', printed: 'Imprimé',
    monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi',
    thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi',
  },
  dashboard: {
    welcomeBack: 'Bienvenue,', totalStudents: 'Total Élèves',
    enrolledThisYear: 'inscrits cette année', teachers: 'Enseignants',
    activeStaff: 'personnel actif', classes: 'Spécialités', activeStreams: 'filières actives',
    attendanceToday: "Présence aujourd'hui", presentToday: "présents aujourd'hui",
    todaysAttendance: 'Présence du jour', records: 'enregistrements',
    feeCollection: 'Collecte des frais', collected: 'Collecté', pending: 'En attente',
    transcripts: 'Relevés de notes', absentToday: "Absents aujourd'hui", students: 'élèves',
    recentActivity: 'Activité récente',
    allPresent: "Tous les élèves sont présents aujourd'hui !",
    studentDirectory: 'Répertoire des élèves', guardianPhone: 'Tél. tuteur', noFeeRecord: 'Aucun dossier',
  },
  students: {
    searchPlaceholder: 'Rechercher des élèves...', addStudent: 'Ajouter un élève',
    allClasses: 'Toutes les spécialités', allGenders: 'Tous les sexes',
    studentsFound: 'élèves trouvés', totalStudents: 'Total',
    male: 'Garçons', female: 'Filles', activeStudents: 'Actifs',
    admNo: 'N° Matr.', gender: 'Sexe', guardian: 'Tuteur',
    noStudents: 'Aucun élève ne correspond à votre recherche.',
    profileTitle: "Profil de l'élève", editTitle: 'Modifier un élève', addTitle: 'Ajouter un nouvel élève',
    personalInfo: 'Informations personnelles', schoolInfo: 'Informations scolaires',
    guardianInfo: 'Informations du tuteur', dateOfBirth: 'Date de naissance',
    admissionDate: "Date d'admission", relationship: 'Lien de parenté', address: 'Adresse',
    firstName: 'Prénom', lastName: 'Nom de famille',
    required: 'Ce champ est obligatoire', studentAdded: 'Élève ajouté avec succès !',
  },
  classes: {
    addClass: 'Ajouter une spécialité', activeThisTerm: 'spécialités actives ce semestre',
    enrollment: 'Effectif', boys: 'Garçons', girls: 'Filles',
    classDetails: 'Détails des spécialités', gradeLevel: 'Niveau',
    classTeacher: 'Enseignant de spécialité', room: 'Salle', enrolled: 'Inscrits',
    capacity: 'Capacité', classOverview: 'Vue d\'ensemble',
    studentsInClass: 'Élèves dans cette spécialité', teacherDetails: 'Informations sur l\'enseignant',
    noStudents: 'Aucun élève inscrit', addTitle: 'Ajouter une nouvelle spécialité',
    classAdded: 'Spécialité ajoutée avec succès !', className: 'Nom de la spécialité',
    noClasses: 'Aucune spécialité',
  },
  teachers: {
    addTeacher: 'Ajouter un enseignant', activeTeachers: 'enseignants actifs',
    staffRegister: 'Registre du personnel', subjects: 'Cours',
    classAssigned: 'Spécialité assignée', qualification: 'Qualification',
    joinDate: "Date d'arrivée", none: '—',
    overview: "Vue d'ensemble", classesTeaching: 'Spécialités', attendanceRecord: 'Présences',
    schedule: 'Emploi du temps', periodsPerWeek: 'Séances / Sem.',
    yearsOfService: 'Années de service', free: 'Libre', noSchedule: 'Aucun emploi du temps',
    addTitle: 'Ajouter un nouvel enseignant', teacherAdded: 'Enseignant ajouté avec succès !',
    professionalInfo: 'Informations professionnelles',
    selectSubjects: 'Sélectionner les cours enseignés',
    noSubjectsSelected: 'Sélectionnez au moins un cours',
    optionalClass: 'Spécialité assignée (optionnel)',
    editTitle: "Modifier l'enseignant", teacherUpdated: 'Enseignant modifié avec succès !',
    deleteTeacher: "Supprimer l'enseignant",
    confirmDelete: 'Êtes-vous sûr de vouloir supprimer',
    cannotUndo: 'Cette action est irréversible.',
    teacherDeleted: 'Enseignant supprimé.',
  },
  attendance: {
    date: 'Date', class: 'Spécialité', markAll: 'Tout marquer',
    saveAttendance: 'Enregistrer la présence', students: 'élèves',
  },
  assessments: {
    class: 'Spécialité', subject: 'Cours', term: 'Semestre',
    saveMarks: 'Enregistrer les notes', classAverage: 'Moyenne de spécialité',
    passed: 'Admis', failed: 'Recalés', caOutOf: 'CC /40', examOutOf: 'Examen /60',
    totalOutOf: 'Total', grade: 'Note', remark: 'Observation',
  },
  transcripts: {
    preview: 'Aperçu', printTranscript: 'Imprimer le relevé',
  },
  fees: {
    totalBilled: 'Total facturé', collected: 'Collecté', outstanding: 'Solde dû',
    recordPayment: 'Enregistrer un paiement', billed: 'Facturé', paid: 'Payé',
    balance: 'Solde', dueDate: "Date d'échéance", paymentHistory: 'Historique des paiements',
    amountDue: 'Montant dû', amountPaid: 'Montant payé',
    collectedPct: '% collecté', noRecords: 'Aucun enregistrement trouvé.', fee: 'Frais',
    addFeeRecord: 'Ajouter un enregistrement',
  },
  timetable: {
    weeklyTimetable: 'Emploi du temps hebdomadaire', period: 'Séance', time: 'Heure',
    break: 'Récréation', lunch: 'Déjeuner',
    editPeriod: 'Modifier la séance', clearPeriod: 'Effacer', apply: 'Appliquer',
    saveTimetable: "Enregistrer l'emploi du temps", timetableSaved: 'Emploi du temps enregistré !',
    selectSubject: 'Sélectionner un cours', selectTeacher: 'Enseignant (optionnel)',
    empty: 'Vide', resetAll: 'Tout réinitialiser', downloadTimetable: 'Télécharger PDF',
  },
  settings: {
    schoolInformation: "Informations de l'école", saveChanges: 'Enregistrer les modifications',
    gradingScale: 'Barème de notation', minScore: 'Note min', maxScore: 'Note max',
    remark: 'Observation', schoolName: "Nom de l'école", schoolCode: "Code de l'école",
    address: 'Adresse', phone: 'Téléphone', email: 'Email',
    headTeacher: 'Directeur(trice)', motto: 'Devise',
    feeSchedule: 'Calendrier des versements', installment: 'Versement',
    totalAmount: 'Total', feeScheduleHint: 'Les montants doivent totaliser 100 000 FCFA',
    subjects: 'Cours', subjectsHint: "Gérer les cours utilisés dans l'emploi du temps et les évaluations",
    addSubject: 'Ajouter un cours', subjectName: 'Nom du cours', subjectCode: 'Code (ex. MTH)', subjectCoefficient: 'Coefficient', subjectCreditHours: 'Crédits',
    deleteSubject: 'Supprimer le cours', noSubjects: 'Aucun cours défini.',
    classCreateValidation: 'Le nom et le niveau sont requis.',
    invalidGradeLevel: 'Le niveau sélectionné est invalide.',
  },
  portal: {
    myProfile: 'Mon Profil', myClass: 'Ma Spécialité', markEntry: 'Saisie des notes',
    myAttendance: 'Mon Assiduité', reportAbsence: 'Signaler une absence',
    behavior: 'Comportement', salary: 'Salaire', withdrawalRequest: 'Demande de retrait',
    myChildren: 'Mes Enfants', academicPerformance: 'Résultats scolaires',
    feeBalance: 'Solde des frais', myMarks: 'Mes Notes', myTimetable: 'Mon Emploi du temps',
    myAttendanceRecord: 'Mon Assiduité', transcripts: 'Relevés de notes',
    studentBehavior: 'Comportement des élèves', myFees: 'Mes Frais',
  },
  userManagement: {
    title: 'Gestion des utilisateurs', createAccount: 'Créer un compte', resetPassword: 'Réinitialiser le mot de passe',
    linkedEntity: 'Lié à', role: 'Rôle', accountCreated: 'Compte créé avec succès',
    passwordReset: 'Mot de passe réinitialisé', createPortalAccounts: 'Créer les comptes portail automatiquement',
    migrationSuccess: 'Comptes portail créés avec succès', deleteUser: 'Supprimer l\'utilisateur',
    confirmDelete: 'Êtes-vous sûr de vouloir supprimer ce compte ?',
  },
};
