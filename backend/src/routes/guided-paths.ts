import { json } from 'itty-router';

interface GuidedStep {
  step: number;
  title: string;
  figiSays: string;
  buildPrompt: string;
  designStyle?: string;
  afterExplanation: string;
  conceptsIntroduced: string[];
}

interface GuidedPath {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  icon: string;
  chapters_covered: string[];
  xp_reward: number;
  steps: GuidedStep[];
}

const GUIDED_PATHS: GuidedPath[] = [
  {
    id: 'contact-manager',
    name: 'Build a Contact Manager',
    description: 'Learn full-stack development by building a contact manager with a React frontend, Cloudflare Workers API, and D1 database.',
    difficulty: 'beginner',
    duration: '30 min',
    icon: '📇',
    chapters_covered: ['ch7', 'ch8', 'ch9'],
    xp_reward: 500,
    steps: [
      {
        step: 1,
        title: 'The Foundation',
        figiSays: "Let's start with the frontend — a clean page where contacts will live. I'll build the basic structure, and then I'll explain how React components work together.",
        buildPrompt: 'Build a contact manager app with a header saying "My Contacts", an empty contact list area, and an "Add Contact" button. Use a dark theme with a clean modern design.',
        designStyle: 'material',
        afterExplanation: "See that `App.jsx` file? That's your main React component — think of it like the front door of your app. Everything the user sees starts here. The `useState` hook at the top is how React remembers things — like your contact list. Right now it's empty, but we're about to fill it up. This is exactly what Ch8 (Building the Screen) teaches.",
        conceptsIntroduced: ['React components', 'useState', 'JSX', 'component structure'],
      },
      {
        step: 2,
        title: 'The Add Contact Form',
        figiSays: "Now let's add a form so users can actually add contacts. Watch how React handles user input — it's different from regular HTML forms.",
        buildPrompt: 'Add an "Add Contact" form with fields for name, email, and phone number. When submitted, the contact should appear in the list below. Include form validation — name and email are required. Show a success message when a contact is added.',
        afterExplanation: "Notice how each input has an `onChange` handler? In React, forms are 'controlled' — the component's state is the single source of truth for what's in the input. When you type, `onChange` fires, state updates, and React re-renders the input with the new value. It feels roundabout, but it gives you total control. Ch8 lesson on 'Forms That Actually Work' goes deep on this.",
        conceptsIntroduced: ['Controlled forms', 'onChange handlers', 'form validation', 'event handling'],
      },
      {
        step: 3,
        title: 'Edit and Delete',
        figiSays: "A contact list isn't useful if you can't edit or remove contacts. Let's add those features and learn about updating state immutably.",
        buildPrompt: 'Add the ability to edit existing contacts (click a contact to edit inline) and delete contacts (with a confirmation). Show a contact count at the top. Add a search/filter bar to find contacts by name or email.',
        afterExplanation: "That `filter()` function for search and the `map()` with spread operator for editing — those are the bread and butter of React state management. You never modify state directly (that's 'mutation'). Instead, you create a new array with the changes. `setContacts(contacts.filter(c => c.id !== id))` creates a new array WITHOUT the deleted contact. React sees the new array, compares it to the old one, and only re-renders what changed. Efficient and predictable. Ch8 covers this pattern extensively.",
        conceptsIntroduced: ['Immutable state updates', 'Array methods (filter, map)', 'Conditional rendering', 'Search/filter pattern'],
      },
      {
        step: 4,
        title: 'Make It Persist',
        figiSays: "Right now, refreshing the page loses all contacts. Let's save them to localStorage so they survive page refreshes. Later, when you're ready for Ch7, we'd move this to a real database.",
        buildPrompt: 'Save contacts to localStorage so they persist between page refreshes. Load saved contacts when the app starts. Add a "Clear All" button with confirmation. Add contact categories (Personal, Work, Family) with color-coded tags.',
        afterExplanation: "localStorage is the simplest way to persist data in the browser — it's just key-value storage. The `useEffect` hook loads contacts when the app mounts (empty dependency array means 'run once on mount'). The second `useEffect` saves whenever contacts change. This pattern works great for small apps. For real apps with multiple users, you'd use a database like D1 — which is exactly what Ch7 teaches.",
        conceptsIntroduced: ['localStorage', 'useEffect', 'Data persistence', 'Side effects', 'Lifecycle'],
      },
      {
        step: 5,
        title: 'Polish and Ship',
        figiSays: "Let's make it beautiful and handle edge cases. Good apps aren't just functional — they feel good to use.",
        buildPrompt: 'Polish the contact manager: add smooth animations for adding/removing contacts, a responsive layout that works on mobile, empty state illustration when no contacts exist, and a dark/light theme toggle. Add subtle hover effects and transitions throughout.',
        afterExplanation: "Congrats — you just built a real app! It has a form, state management, persistence, search, categories, and responsive design. These are the exact same patterns used in apps with millions of users. The difference between this and a production app is mainly the backend (Ch7) and deployment (Ch10). You've got the frontend down. Want to keep going and add a real backend?",
        conceptsIntroduced: ['CSS animations', 'Responsive design', 'Empty states', 'Theme toggling', 'UX polish'],
      },
    ],
  },
  {
    id: 'blog-platform',
    name: 'Build a Blog Platform',
    description: 'Learn multi-page apps, content management, and routing by building a blog with posts, categories, and navigation.',
    difficulty: 'intermediate',
    duration: '35 min',
    icon: '📝',
    chapters_covered: ['ch7', 'ch8', 'ch10'],
    xp_reward: 600,
    steps: [
      {
        step: 1,
        title: 'The Blog Home',
        figiSays: "We're building a multi-page blog. The home page shows post previews — this teaches you about component composition and data-driven UI.",
        buildPrompt: 'Build a blog platform home page with a header (blog name, navigation links to Home, About, Contact), a grid of 4 blog post cards showing title, excerpt, date, category tag, and read time. Use realistic sample content about technology topics. Dark professional theme.',
        designStyle: 'glassmorphism',
        afterExplanation: "Notice how each blog post card is the same structure with different data? That's the power of components — you write the card template once, then render it for each post using `map()`. This is exactly how Instagram, Twitter, and every social feed works. The data drives the UI.",
        conceptsIntroduced: ['Component composition', 'Rendering lists with map()', 'Props', 'Data-driven UI'],
      },
      {
        step: 2,
        title: 'Individual Post Pages',
        figiSays: "Now let's make each post clickable with its own full page. This introduces multi-page navigation — a core concept for any real web app.",
        buildPrompt: 'Add separate HTML pages for each of the 4 blog posts with full article content (at least 3 paragraphs each). Add working navigation between the home page and each post. Include a "Back to Home" link, author info, and estimated read time on each post page.',
        afterExplanation: "Each post is now its own HTML file with full content. The navigation between pages works because we're using relative links (href='post-1.html'). In a production app, you'd use React Router for client-side navigation (no full page reload). But the concept is the same — URLs map to content. Ch8 covers React Router in detail.",
        conceptsIntroduced: ['Multi-page navigation', 'URL routing', 'Content pages', 'Link patterns'],
      },
      {
        step: 3,
        title: 'About and Contact Pages',
        figiSays: "Every real website has supporting pages. Let's add About and Contact with a working form.",
        buildPrompt: 'Add an About page (team section with 3 members, mission statement, company story) and a Contact page (contact form with name, email, subject, message, and a submit button with validation). All pages share the same header navigation.',
        afterExplanation: "See how the navigation is identical on every page? In React, this would be a shared Layout component that wraps every page. With plain HTML, you repeat it. This is one of the biggest reasons developers use React — shared components eliminate repetition. The contact form uses the same controlled input patterns from our Contact Manager project.",
        conceptsIntroduced: ['Shared layouts', 'Form patterns', 'DRY principle', 'Componentization motivation'],
      },
      {
        step: 4,
        title: 'Categories and Archive',
        figiSays: "Let's add a category filter and archive page — this teaches data filtering and organization patterns.",
        buildPrompt: 'Add category filter buttons on the home page (Technology, Design, Business, All) that filter the post grid. Add an Archive page that lists all posts grouped by month. Add a sidebar to the home page showing popular posts, categories with post counts, and a newsletter signup form.',
        afterExplanation: "Filtering is just `array.filter()` based on the selected category — same pattern we used in the Contact Manager search. The sidebar pattern is used everywhere: dashboards, e-commerce sites, documentation. Notice how we're reusing skills from the previous project? That's how real development works — patterns repeat across every app you build.",
        conceptsIntroduced: ['Data filtering', 'Sidebar layouts', 'Category systems', 'Information architecture'],
      },
      {
        step: 5,
        title: 'Polish and Ship',
        figiSays: "Final step — let's add the visual polish that makes a blog feel professional.",
        buildPrompt: 'Polish the blog: add reading progress bar at the top of post pages, smooth page transitions, social share buttons on each post, a "Related Posts" section at the bottom of each post page, and responsive design that works beautifully on mobile.',
        afterExplanation: "You just built a complete blog platform! A real content team could use this tomorrow. From here, making it dynamic (posts from a database instead of hardcoded) is exactly what Ch7 teaches — replace the hardcoded data with API calls to a backend. The frontend patterns you learned here don't change at all.",
        conceptsIntroduced: ['Scroll progress tracking', 'Social integration', 'Responsive design', 'Related content'],
      },
    ],
  },
  {
    id: 'dashboard-app',
    name: 'Build an Analytics Dashboard',
    description: 'Learn data visualization, layout systems, and interactive UI by building an analytics dashboard.',
    difficulty: 'intermediate',
    duration: '35 min',
    icon: '📊',
    chapters_covered: ['ch7', 'ch8'],
    xp_reward: 600,
    steps: [
      {
        step: 1,
        title: 'The Layout Shell',
        figiSays: "Dashboards are all about layout — a sidebar navigation and a main content area. This teaches you CSS Grid and Flexbox.",
        buildPrompt: 'Build a dashboard layout with a sidebar navigation (Dashboard, Analytics, Users, Settings, Logout) and a main content area. The sidebar should be dark with icons next to each nav item. Add a top header bar with a search input, notification bell, and user avatar. Dark theme.',
        designStyle: 'material',
        afterExplanation: "This sidebar + main area layout is CSS Grid in action: `grid-template-columns: 250px 1fr`. The sidebar takes exactly 250px, and `1fr` means the main area takes all remaining space. This exact pattern is used by VS Code, Slack, Discord, Gmail — almost every web app you use daily.",
        conceptsIntroduced: ['CSS Grid', 'Flexbox', 'Sidebar layout pattern', 'Navigation structure'],
      },
      {
        step: 2,
        title: 'Stats Cards',
        figiSays: "Now let's add the key metrics — those big number cards at the top of every dashboard. This teaches you component reuse.",
        buildPrompt: 'Add a row of 4 stat cards at the top of the dashboard: Total Revenue ($48,250, +12%), Active Users (2,847, +8%), New Signups (384, +23%), and Bounce Rate (24%, -3%). Each card has an icon, the number, the label, and a percentage change badge (green for positive, red for negative).',
        afterExplanation: "Four cards that look different but use the exact same component — just different props. `<StatCard icon='💰' value='$48,250' label='Revenue' change='+12%' />`. This is React's superpower: build once, use everywhere. The percentage badge with green/red color is conditional rendering: `change.startsWith('+') ? 'green' : 'red'`.",
        conceptsIntroduced: ['Reusable components', 'Props patterns', 'Conditional styling', 'Card layouts'],
      },
      {
        step: 3,
        title: 'Charts and Data Visualization',
        figiSays: "Dashboards need charts. Let's add a line chart for revenue trends and a bar chart for user activity.",
        buildPrompt: 'Add a revenue line chart showing monthly data for the past 12 months, and a bar chart showing daily active users for the past week. Below that, add a donut/pie chart showing traffic sources (Direct 40%, Search 30%, Social 20%, Referral 10%). Use CSS and JavaScript for the charts — make them look polished with tooltips on hover.',
        afterExplanation: "Charts are just data mapped to visual elements. The line chart plots points and connects them with paths. The bar chart maps values to heights. The donut chart uses CSS `conic-gradient`. In production, you'd use a library like Recharts or Chart.js, but understanding that charts are just 'data → pixels' is the key insight.",
        conceptsIntroduced: ['Data visualization', 'Canvas/SVG basics', 'CSS conic-gradient', 'Tooltip interactions'],
      },
      {
        step: 4,
        title: 'Data Table with Actions',
        figiSays: "Every dashboard needs a data table. This teaches you table patterns, sorting, and pagination.",
        buildPrompt: 'Add a "Recent Transactions" table below the charts showing 10 rows with: Date, Customer Name, Amount, Status (Completed/Pending/Failed with colored badges), and an Actions column (View/Edit buttons). Add column header click-to-sort and a pagination bar at the bottom.',
        afterExplanation: "Tables are arrays of objects rendered as rows. Sorting is `array.sort()` based on which column was clicked. Pagination is `array.slice(startIndex, endIndex)` where the indices change based on the current page. Status badges are conditional rendering again — same pattern as the stat cards. These patterns compose endlessly.",
        conceptsIntroduced: ['Table rendering', 'Sorting', 'Pagination', 'Status indicators', 'Action buttons'],
      },
      {
        step: 5,
        title: 'Interactive and Polish',
        figiSays: "Let's make the dashboard feel alive — real dashboards respond to user actions and show real-time updates.",
        buildPrompt: 'Add interactivity: clicking a stat card filters the chart to show only that metric. Add a date range picker that changes the chart data. Add a notification dropdown when clicking the bell icon (show 5 sample notifications). Make the sidebar collapsible. Add smooth transitions throughout. Ensure it works on tablet and mobile.',
        afterExplanation: "You built a professional analytics dashboard from scratch! This covers most of the frontend patterns used in real SaaS products. The next evolution is connecting it to real data from an API (Ch7) and deploying it (Ch10). Every SaaS app you've seen — Stripe Dashboard, Vercel Dashboard, Cloudflare Dashboard — uses these exact same patterns at a larger scale.",
        conceptsIntroduced: ['Interactive filtering', 'Date pickers', 'Dropdown menus', 'Collapsible navigation', 'Responsive dashboards'],
      },
    ],
  },
];

export const guidedPathsRoutes = {
  list(): Response {
    return Response.json({
      success: true,
      data: {
        paths: GUIDED_PATHS.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          difficulty: p.difficulty,
          duration: p.duration,
          icon: p.icon,
          chapters_covered: p.chapters_covered,
          xp_reward: p.xp_reward,
          stepCount: p.steps.length,
        })),
      },
    });
  },

  getPath(req: { params: { pathId: string } }): Response {
    const path = GUIDED_PATHS.find(p => p.id === req.params.pathId);
    if (!path) {
      return Response.json({ success: false, error: 'Path not found' }, { status: 404 });
    }
    return Response.json({ success: true, data: { path } });
  },
};
