import { connectDB } from './db.js';
import { Company, Drive, Resource, Notification } from './models.js';
await connectDB();
await Company.deleteMany({});
await Drive.deleteMany({});
await Resource.deleteMany({});
await Notification.deleteMany({});
const companies = await Company.insertMany([
    {
        name: 'TCS',
        industry: 'IT Services',
        location: 'Mumbai',
        website: 'https://www.tcs.com',
        companySize: '500,000+',
        recruiterName: 'Campus Hiring',
        recruiterEmail: 'campus@tcs.com',
        description: 'Global IT services, consulting and business solutions.',
        isActive: true,
    },
    {
        name: 'Infosys',
        industry: 'Technology',
        location: 'Pune',
        website: 'https://www.infosys.com',
        companySize: '300,000+',
        recruiterName: 'Talent Acquisition',
        recruiterEmail: 'campus@infosys.com',
        description: 'Digital services and consulting.',
        isActive: true,
    },
    {
        name: 'Wipro',
        industry: 'IT Services',
        location: 'Bengaluru',
        website: 'https://www.wipro.com',
        companySize: '250,000+',
        recruiterName: 'University Relations',
        recruiterEmail: 'campus@wipro.com',
        description: 'Information technology, consulting and business process services.',
        isActive: true,
    },
    {
        name: 'Accenture',
        industry: 'Consulting',
        location: 'Mumbai',
        website: 'https://www.accenture.com',
        companySize: '700,000+',
        recruiterName: 'Recruiting',
        recruiterEmail: 'campus@accenture.com',
        description: 'Professional services company specializing in strategy and technology.',
        isActive: true,
    },
]);
const byName = Object.fromEntries(companies.map((c) => [c.name, c]));
await Drive.insertMany([
    {
        companyId: byName.TCS._id,
        company: 'TCS',
        title: 'Software Engineer — Graduate',
        location: 'Mumbai / Hybrid',
        type: 'Full-time',
        package: '₹7.5 LPA',
        deadline: new Date('2026-10-15'),
        description: 'Graduate software engineering role.',
        eligibility: 'B.Tech / B.E. CSE, IT or related',
        eligibleCourses: ['B.Tech CSE', 'B.Tech IT', 'BSc IT'],
        minimumCGPA: 6.5,
        requiredSkills: ['Java', 'SQL'],
        status: 'PUBLISHED',
    },
    {
        companyId: byName.Infosys._id,
        company: 'Infosys',
        title: 'Systems Engineer',
        location: 'Pune',
        type: 'Full-time',
        package: '₹6.5 LPA',
        deadline: new Date('2026-10-20'),
        description: 'Entry-level systems engineering opportunity.',
        eligibility: 'Graduates with strong programming fundamentals',
        status: 'PUBLISHED',
    },
    {
        companyId: byName.Wipro._id,
        company: 'Wipro',
        title: 'Project Engineer',
        location: 'Bengaluru',
        type: 'Full-time',
        package: '₹6 LPA',
        deadline: new Date('2026-10-25'),
        description: 'Engineering role across modern enterprise stacks.',
        eligibility: '2026 graduates',
        status: 'PUBLISHED',
    },
    {
        companyId: byName.Accenture._id,
        company: 'Accenture',
        title: 'Associate Software Engineer',
        location: 'Mumbai',
        type: 'Full-time',
        package: '₹8 LPA',
        deadline: new Date('2026-11-01'),
        description: 'Technology consulting and engineering role.',
        eligibility: 'Engineering graduates',
        status: 'PUBLISHED',
    },
]);
await Resource.insertMany([
    {
        title: 'Resume Masterclass',
        type: 'Guide',
        url: 'https://www.indeed.com/career-advice/resumes-cover-letters',
        description: 'Practical guidance for building a strong resume.',
    },
    {
        title: 'Interview Preparation',
        type: 'Guide',
        url: 'https://www.pramp.com/',
        description: 'Practice technical and behavioral interviews.',
    },
    {
        title: 'DSA Roadmap',
        type: 'Learning',
        url: 'https://neetcode.io/roadmap',
        description: 'Structured roadmap for coding interview preparation.',
    },
]);
console.log('Seed complete');
process.exit(0);
