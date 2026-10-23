import type { Category, Lesson } from './types'

// Sample catalogue used in demo mode and as an example for the real database.
// Replace with your own lessons from the admin area once the site is live.

export const seedCategories: Category[] = [
  { id: 'cat-life', name: 'Everyday life', slug: 'everyday-life', description: 'Family, sleep, habits and the routines everyone can talk about.' },
  { id: 'cat-society', name: 'Society and money', slug: 'society-and-money', description: 'Work, money, fairness and the choices people make.' },
  { id: 'cat-tech', name: 'Science and tech', slug: 'science-and-tech', description: 'Screens, AI, health and the future.' },
  { id: 'cat-culture', name: 'Culture and travel', slug: 'culture-and-travel', description: 'Food, places, traditions and luck.' },
  { id: 'cat-family-and-friends', name: 'Family and friends', slug: 'family-and-friends', description: 'Relationships, home life and the people around us.' },
  { id: 'cat-school-and-learning', name: 'School and learning', slug: 'school-and-learning', description: 'Classes, studying, exams and how we learn.' },
  { id: 'cat-food-and-cooking', name: 'Food and cooking', slug: 'food-and-cooking', description: 'Meals, recipes, restaurants and food around the world.' },
  { id: 'cat-health-and-wellbeing', name: 'Health and wellbeing', slug: 'health-and-wellbeing', description: 'Sleep, sport, stress and staying healthy.' },
  { id: 'cat-work-and-careers', name: 'Work and careers', slug: 'work-and-careers', description: 'Jobs, interviews, the workplace and future careers.' },
  { id: 'cat-technology-and-the-internet', name: 'Technology and the internet', slug: 'technology-and-the-internet', description: 'Screens, social media, AI and gadgets.' },
  { id: 'cat-environment-and-nature', name: 'Environment and nature', slug: 'environment-and-nature', description: 'Climate, animals, weather and the planet.' },
  { id: 'cat-animals', name: 'Animals', slug: 'animals', description: 'Pets, wild animals and amazing creatures.' },
  { id: 'cat-travel-and-places', name: 'Travel and places', slug: 'travel-and-places', description: 'Trips, cities, countries and getting around.' },
  { id: 'cat-culture-and-traditions', name: 'Culture and traditions', slug: 'culture-and-traditions', description: 'Festivals, customs and how people live.' },
  { id: 'cat-holidays-and-celebrations', name: 'Holidays and celebrations', slug: 'holidays-and-celebrations', description: 'Birthdays, festivals and special days.' },
  { id: 'cat-sports-and-hobbies', name: 'Sports and hobbies', slug: 'sports-and-hobbies', description: 'Games, free time and things we love doing.' },
  { id: 'cat-entertainment-and-media', name: 'Entertainment and media', slug: 'entertainment-and-media', description: 'Films, music, books, games and the news.' },
  { id: 'cat-money-and-shopping', name: 'Money and shopping', slug: 'money-and-shopping', description: 'Spending, saving, shopping and value.' },
  { id: 'cat-science-and-discovery', name: 'Science and discovery', slug: 'science-and-discovery', description: 'Space, inventions and how the world works.' },
  { id: 'cat-ethics-and-dilemmas', name: 'Ethics and dilemmas', slug: 'ethics-and-dilemmas', description: 'Hard choices, right and wrong, and what you would do.' },
  { id: 'cat-society-and-current-issues', name: 'Society and current issues', slug: 'society-and-current-issues', description: 'Cities, fairness, rules and the news.' },
  { id: 'cat-survival-and-adventure', name: 'Survival and adventure', slug: 'survival-and-adventure', description: 'Disasters, challenges, explorers and staying alive.' },
  { id: 'cat-fantasy-and-imagination', name: 'Fantasy and imagination', slug: 'fantasy-and-imagination', description: 'What if, superpowers, stories and the future.' },
  { id: 'cat-exam-practice', name: 'Exam practice', slug: 'exam-practice', description: 'IELTS, Cambridge and other exam-style speaking practice.' },
]

const spine = `Every lesson follows the same classroom-tested path, so students always know what comes next:

Warm-up with three visuals and an open prompt
Four opening questions to get everyone talking
Vocabulary matching with 8 to 10 key words and phrases
A model conversation that recycles the new vocabulary
Topic content with discussion questions
Real-life scenarios to apply the ideas
Situations and dilemmas with no single right answer
A structured debate with sentence starters
A final project or creative task`

type SeedLesson = Omit<Lesson, 'createdAt' | 'currency' | 'coverImageUrl' | 'previewImages' | 'slideImages' | 'filePath' | 'fileName' | 'published'>

const lessons: SeedLesson[] = [
  {
    id: 'les-lucky-breaks',
    slug: 'lucky-breaks',
    title: 'Lucky Breaks',
    summary: 'Luck, chance and superstition: do we make our own luck?',
    description: `Students explore good and bad luck, superstitions around the world and the difference between luck and hard work.\n\n${spine}`,
    level: 'B1', ageGroup: 'Teens', categoryId: 'cat-culture',
    topics: ['Luck', 'Superstitions', 'Success'],
    activityTypes: ['Discussion questions', 'Vocabulary', 'Situations and dilemmas', 'Debate', 'Project'],
    sampleQuestions: [
      'Do you have a lucky number, colour or object?',
      'Is a successful person lucky, or did they make their own luck?',
      'Would you rather find $100 or have a perfect exam day?',
    ],
    priceCents: 0, slideCount: 24, durationMinutes: 60, coverColor: '#46725D', featured: true,
  },
  {
    id: 'les-sleep-on-it',
    slug: 'sleep-on-it',
    title: 'Sleep On It',
    summary: 'Sleep habits, dreams and the science of rest.',
    description: `A lively lesson on sleep routines, dreams, night owls and early birds, and why teenagers need more sleep than adults think.\n\n${spine}`,
    level: 'B1', ageGroup: 'Teens', categoryId: 'cat-life',
    topics: ['Sleep', 'Health', 'Habits'],
    activityTypes: ['Discussion questions', 'Vocabulary', 'Situations and dilemmas', 'Debate'],
    sampleQuestions: [
      'Are you a night owl or an early bird?',
      'Should schools start later so students can sleep more?',
      'What is the strangest dream you can remember?',
    ],
    priceCents: 499, slideCount: 26, durationMinutes: 60, coverColor: '#3D405B', featured: true,
  },
  {
    id: 'les-all-in-the-family',
    slug: 'all-in-the-family',
    title: 'All in the Family',
    summary: 'Family roles, siblings and growing up, with sentence frames for every task.',
    description: `Teens talk about family life, chores, sibling rivalry and generation gaps. Includes printed follow-up prompts, sentence frames and a "Say it better" reformulation slot.\n\n${spine}`,
    level: 'B1', ageGroup: 'Teens', categoryId: 'cat-life',
    topics: ['Family', 'Relationships', 'Chores'],
    activityTypes: ['Discussion questions', 'Vocabulary', 'Role-play', 'Debate'],
    sampleQuestions: [
      'Who are you most similar to in your family?',
      'Is it better to be the oldest, the middle or the youngest child?',
      'Should teenagers be paid for doing chores?',
    ],
    priceCents: 499, slideCount: 28, durationMinutes: 60, coverColor: '#7A5C8C', featured: true,
  },
  {
    id: 'les-money-talks',
    slug: 'money-talks',
    title: 'Money Talks',
    summary: 'Economics and personal finance made discussable.',
    description: `Saving, spending, budgets and big economic ideas in everyday language. Types of spending, real budgets to analyse and a debate on cash versus cards.\n\n${spine}`,
    level: 'B2', ageGroup: 'Adults', categoryId: 'cat-society',
    topics: ['Money', 'Economics', 'Shopping'],
    activityTypes: ['Discussion questions', 'Vocabulary', 'Situations and dilemmas', 'Debate', 'Project'],
    sampleQuestions: [
      'Are you a saver or a spender?',
      'Should schools teach students how to manage money?',
      'Would you lend money to a close friend?',
    ],
    priceCents: 599, slideCount: 30, durationMinutes: 75, coverColor: '#9A6A1F', featured: true,
  },
  {
    id: 'les-screen-time',
    slug: 'screen-time',
    title: 'Screen Time',
    summary: 'Phones, games and social media: how much is too much?',
    description: `Students reflect on their own screen habits, compare apps and argue about phone rules at school and at home.\n\n${spine}`,
    level: 'B1', ageGroup: 'Teens', categoryId: 'cat-tech',
    topics: ['Technology', 'Social media', 'Habits'],
    activityTypes: ['Discussion questions', 'Vocabulary', 'Debate', 'Project'],
    sampleQuestions: [
      'Which app could you never delete?',
      'Should phones be banned in schools?',
      'Is gaming a waste of time or a useful skill?',
    ],
    priceCents: 499, slideCount: 25, durationMinutes: 60, coverColor: '#5B6C8F', featured: false,
  },
  {
    id: 'les-the-ai-question',
    slug: 'the-ai-question',
    title: 'The AI Question',
    summary: 'Robots, chatbots and the future of work.',
    description: `Advanced learners discuss artificial intelligence at school and at work, weigh up risks and benefits, and run a formal four-corners debate.\n\n${spine}`,
    level: 'C1', ageGroup: 'Adults', categoryId: 'cat-tech',
    topics: ['Artificial intelligence', 'Work', 'The future'],
    activityTypes: ['Discussion questions', 'Vocabulary', 'Situations and dilemmas', 'Debate'],
    sampleQuestions: [
      'Which job will AI never be able to do?',
      'Should students be allowed to use AI for homework?',
      'Would you trust a robot doctor?',
    ],
    priceCents: 699, slideCount: 32, durationMinutes: 75, coverColor: '#3D405B', featured: false,
  },
  {
    id: 'les-food-fights',
    slug: 'food-fights',
    title: 'Food Fights',
    summary: 'Food cultures, table manners and the great pineapple pizza debate.',
    description: `From street food to family dinners, students describe dishes, compare food traditions and defend their tastes.\n\n${spine}`,
    level: 'A2', ageGroup: 'Teens', categoryId: 'cat-culture',
    topics: ['Food', 'Culture', 'Manners'],
    activityTypes: ['Discussion questions', 'Vocabulary', 'Role-play', 'Debate'],
    sampleQuestions: [
      'What food could you eat every day?',
      'Does pineapple belong on pizza?',
      'What is a food from your country that visitors should try?',
    ],
    priceCents: 399, slideCount: 22, durationMinutes: 50, coverColor: '#6B7F3A', featured: false,
  },
  {
    id: 'les-dream-jobs',
    slug: 'dream-jobs',
    title: 'Dream Jobs',
    summary: 'Careers, ambitions and what makes work meaningful.',
    description: `Students describe jobs, rank what matters most in a career and role-play a job interview.\n\n${spine}`,
    level: 'B2', ageGroup: 'Adults', categoryId: 'cat-society',
    topics: ['Work', 'Careers', 'Ambition'],
    activityTypes: ['Discussion questions', 'Vocabulary', 'Role-play', 'Project'],
    sampleQuestions: [
      'What did you want to be when you were a child?',
      'Would you take a boring job with a high salary?',
      'Is it possible to love your job every day?',
    ],
    priceCents: 599, slideCount: 27, durationMinutes: 60, coverColor: '#2F5D62', featured: false,
  },
  {
    id: 'les-travel-tales',
    slug: 'travel-tales',
    title: 'Travel Tales',
    summary: 'Trips, tourists and the places we dream of.',
    description: `Students share travel stories, plan a dream trip on a budget and solve travel dilemmas together.\n\n${spine}`,
    level: 'A2', ageGroup: 'Adults', categoryId: 'cat-culture',
    topics: ['Travel', 'Places', 'Holidays'],
    activityTypes: ['Discussion questions', 'Vocabulary', 'Situations and dilemmas', 'Project'],
    sampleQuestions: [
      'Beach holiday or city break?',
      'What is the best trip you have ever taken?',
      'Is it better to travel alone or with friends?',
    ],
    priceCents: 399, slideCount: 23, durationMinutes: 50, coverColor: '#5B6C8F', featured: false,
  },
]

export const seedLessons: Lesson[] = lessons.map((l, i) => ({
  ...l,
  currency: 'USD',
  coverImageUrl: null,
  previewImages: [],
  slideImages: [],
  filePath: `${l.slug}/${l.title}.pptx`,
  fileName: `${l.title}.pptx`,
  published: true,
  createdAt: new Date(Date.UTC(2026, 8, 1 + i)).toISOString(),
}))
