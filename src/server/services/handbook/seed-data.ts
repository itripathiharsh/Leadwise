export interface SeedSection {
  sectionType: string
  title: string
  subtitle?: string
  badge?: string
  content?: string
  sortOrder: number
  isVisible: boolean
  data?: Record<string, any>
}

export const INITIAL_HANDBOOK_SEED: {
  slug: string
  title: string
  subtitle: string
  sections: SeedSection[]
} = {
  slug: 'about-sentio-mind',
  title: 'About Sentio Mind',
  subtitle: 'AI-Powered Self-Awareness & Behavioural Intelligence Platform',
  sections: [
    {
      sectionType: 'hero',
      title: 'Sentio Mind',
      subtitle: 'AI-powered self-awareness and behavioural intelligence platform',
      badge: 'Organisation Handbook',
      content:
        'Sentio Mind is an AI-powered platform designed to help people understand themselves, reflect on their experiences, explore their behavioural patterns, and take meaningful steps toward personal growth.\n\nWe are building a human-centred AI ecosystem combining conversational reflection, journaling, behavioural insights, daily rituals, assessments, and personalized guidance.',
      sortOrder: 0,
      isVisible: true,
      data: {
        category: 'AI-Powered Self-Awareness and Behavioural Intelligence',
        whatWeAre: [
          'A human-centred AI ecosystem combining conversations, journaling, daily rituals, and insights.',
          'A technology platform designed to make self-reflection and personal growth accessible and engaging.',
          'A dedicated bridge connecting modern technology with human expertise and clinical guidance.',
          'An ongoing journey: understanding that self-awareness requires reflection, habit, and action.',
        ],
        whatWeAreNot: [
          'Not a replacement for human relationships or family support.',
          'Not a replacement for doctors, clinical psychologists, or licensed counsellors.',
          'Not an emergency response service or crisis intervention replacement.',
          'Not a surveillance system or platform for judging human worth.',
          'Not an automated decision-maker for high-stakes decisions without human oversight.',
          'Not a provider of guaranteed medical, psychological, or diagnostic outcomes.',
        ],
      },
    },
    {
      sectionType: 'mission_vision',
      title: 'Mission & Vision',
      subtitle: 'The purpose that guides our technology and our long-term aspiration for the world',
      badge: 'Purpose & Direction',
      sortOrder: 1,
      isVisible: true,
      data: {
        mission: {
          title: 'Our Mission',
          statement:
            'To help people develop self-awareness and healthier behavioural patterns through meaningful, human-centred AI experiences.',
          explanation:
            'We want to help people pause, reflect, understand their everyday experiences, and make more intentional life choices.',
          points: [
            'Make regular personal reflection effortless to access.',
            'Help people notice recurring patterns in their habits and emotional responses.',
            'Encourage sustainable, positive daily routines and habits.',
            'Connect responsible technology with established human expertise.',
            'Build software experiences that are transparent, safe, and engaging.',
          ],
        },
        vision: {
          title: 'Our Vision',
          statement: 'A world where self-awareness is an integral part of everyday life.',
          explanation:
            'We imagine a future where people have better opportunities to understand themselves and nurture their overall wellbeing.',
          points: [
            'Technology should help people become more self-aware, not more dependent.',
            'Encourage users to understand their emotions and habits with curiosity.',
            'Empower individuals to seek professional support whenever appropriate.',
            'Preserve and strengthen human connection, agency, and intentional growth.',
          ],
        },
      },
    },
    {
      sectionType: 'why_we_exist',
      title: 'Why Sentio Mind Exists',
      subtitle: 'Addressing the fragmentation and overwhelm in everyday self-care and personal reflection',
      badge: 'Our Reason for Being',
      content:
        'People experience diverse challenges in modern life: finding time for quiet reflection, recognizing repetitive behavioural loops, keeping up healthy routines, and knowing when to seek professional care.\n\nMany existing digital tools address only one isolated piece. Sentio Mind brings conversational reflection, private journaling, behavioural insights, guided content, and professional care together into one cohesive ecosystem.',
      sortOrder: 2,
      isVisible: true,
      data: {
        challenges: [
          {
            title: 'Time & Space for Reflection',
            description: 'Modern life moves fast; structured quiet time to review thoughts and feelings is rare.',
          },
          {
            title: 'Recognizing Blind Spots',
            description: 'Without reflection tools, recurring behavioural and stress loops often go unnoticed.',
          },
          {
            title: 'Routine Consistency',
            description: 'Building positive wellbeing habits requires gentle encouragement without guilt.',
          },
          {
            title: 'Fragmented Solutions',
            description: 'Journaling, tracking, and advice are scattered across disparate disconnected apps.',
          },
          {
            title: 'Care Pathways Gap',
            description: 'People often struggle to know when and how to seek qualified human expertise.',
          },
        ],
      },
    },
    {
      sectionType: 'ecosystem',
      title: 'The Sentio Mind Ecosystem',
      subtitle: 'An interconnected suite of reflective, analytical, and supportive experiences',
      badge: 'Product Architecture',
      sortOrder: 3,
      isVisible: true,
      data: {
        items: [
          {
            key: 'senti',
            title: 'Senti — AI Companion',
            tagline: 'Conversational reflection and thoughtful dialogue',
            description:
              'Supports active reflection, helps articulate feelings, and guides users through thoughtful prompts.',
            boundaries:
              'Not a replacement for human companionship or clinical therapy. Encourages professional human support when needed.',
            tone: 'sky',
          },
          {
            key: 'saga',
            title: 'Saga — Personal Journal',
            tagline: 'Private space for thoughts, memories, and entries',
            description:
              'Enables users to record reflections, celebrate moments, observe recurring themes, and build a lasting habit of expression.',
            boundaries:
              'Strict data privacy and encryption. Users retain full ownership and control over their journal content.',
            tone: 'indigo',
          },
          {
            key: 'aura',
            title: 'Aura — Emotional & Behavioural Insights',
            tagline: 'Pattern exploration across experiences and routines',
            description:
              'Summarises user-provided themes, highlights emerging trends, and proposes areas for self-awareness.',
            boundaries:
              'Insights are descriptive aids, never clinical diagnoses or definitive psychological judgements.',
            tone: 'violet',
          },
          {
            key: 'rituals',
            title: 'Daily Rituals',
            tagline: 'Micro-activities for presence and mindfulness',
            description:
              'Short breathing sessions, gratitude practices, mindful check-ins, and intentional morning/evening reflections.',
            boundaries: 'Gentle and optional prompts designed to avoid pressure or guilt-based retention.',
            tone: 'teal',
          },
          {
            key: 'goals',
            title: 'Goals & Intentions',
            tagline: 'Actionable steps toward personal aspirations',
            description:
              'Assists in breaking down large aspirations into manageable daily milestones and tracking consistency.',
            boundaries: 'Never measures a person’s intrinsic worth by completion percentages.',
            tone: 'emerald',
          },
          {
            key: 'assessments',
            title: 'Assessments',
            tagline: 'Standardized screening instruments (PHQ-9, GAD-7)',
            description:
              'Standardized questionnaires that help users reflect on wellbeing trends and prepare for discussions with healthcare professionals.',
            boundaries:
              'Screening tools only; never a substitute for formal clinical diagnosis or emergency intervention.',
            tone: 'amber',
          },
          {
            key: 'counsellors',
            title: 'Counsellor Discovery & Support',
            tagline: 'Pathways connecting users with licensed experts',
            description:
              'Facilitates finding qualified counsellors and therapists, scheduling sessions, and continuing care.',
            boundaries:
              'Human professionals provide clinical judgement and care; software merely facilitates the connection.',
            tone: 'blue',
          },
          {
            key: 'media',
            title: 'Media & Guided Experiences',
            tagline: 'Educational audio, exercises, and audio stories',
            description:
              'Curated content covering mindfulness, sleep, resilience, and personal growth developed with domain specialists.',
            boundaries: 'Continuously reviewed for relevance, cultural sensitivity, and ethical safety.',
            tone: 'slate',
          },
        ],
      },
    },
    {
      sectionType: 'what_we_do',
      title: 'What We Do',
      subtitle: 'The 6 core activities and domains of focus powering Sentio Mind',
      badge: 'Core Focus',
      sortOrder: 4,
      isVisible: true,
      data: {
        items: [
          {
            title: 'Build Human-Centred AI Experiences',
            description:
              'We explore how AI models can assist people in reflecting on everyday moments with empathy and clarity.',
          },
          {
            title: 'Develop Self-Awareness Tools',
            description:
              'We engineer intuitive products including reflective conversational interfaces, private journals, and guided rituals.',
          },
          {
            title: 'Support Behavioural Understanding',
            description:
              'We uncover healthy patterns and recurring triggers from user-provided reflections to encourage informed habits.',
          },
          {
            title: 'Create Engaging Growth Experiences',
            description:
              'We make personal development accessible, rewarding, and deeply humane rather than clinical or cold.',
          },
          {
            title: 'Connect Tech with Human Expertise',
            description:
              'We partner with therapists, researchers, and physicians to ground our features in verified clinical standards.',
          },
          {
            title: 'Research & Experiment Responsibly',
            description:
              'We investigate natural language processing, multimodal interfaces, and behavioural analytics with strict privacy.',
          },
        ],
      },
    },
    {
      sectionType: 'domains',
      title: 'Our Domains of Focus',
      subtitle: 'Exploring 10 interconnected areas of human wellbeing and personal development',
      badge: 'Wellbeing Spectrum',
      sortOrder: 5,
      isVisible: true,
      data: {
        items: [
          {
            name: 'Mental Health',
            focus: ['Self-awareness', 'Emotional wellbeing', 'Reflection', 'Education', 'Care pathways'],
            disclaimer: 'Not a replacement for professional clinical care.',
            tone: 'indigo',
          },
          {
            name: 'Physical Health',
            focus: ['Everyday wellbeing', 'Healthy habits', 'Personal awareness', 'Lifestyle reflection'],
            disclaimer: 'Educational resources only; consult physicians for medical diagnosis.',
            tone: 'blue',
          },
          {
            name: 'Nutrition',
            focus: ['Mindful eating', 'Nutrition education', 'Dietary routines', 'Habit awareness'],
            disclaimer: 'General educational awareness without unsupported clinical diet claims.',
            tone: 'emerald',
          },
          {
            name: 'Fitness & Movement',
            focus: ['Daily movement', 'Sustainable exercise', 'Rest balance', 'Routine building'],
            disclaimer: 'Encouraging self-paced wellness suited to individual capability.',
            tone: 'teal',
          },
          {
            name: 'Sleep & Recovery',
            focus: ['Sleep hygiene', 'Evening wind-down', 'Recovery tracking', 'Habit optimization'],
            disclaimer: 'Educational sleep science and relaxation exercises.',
            tone: 'sky',
          },
          {
            name: 'Spirituality & Mindfulness',
            focus: ['Mindful presence', 'Sense of purpose', 'Quiet reflection', 'Meditation exercises'],
            disclaimer: 'Honours diverse cultural, spiritual, and personal worldviews.',
            tone: 'violet',
          },
          {
            name: 'Learning & Education',
            focus: ['Lifelong curiosity', 'Cognitive growth', 'Skill development', 'Reflective study'],
            disclaimer: 'Supporting personal mastery and intellectual exploration.',
            tone: 'amber',
          },
          {
            name: 'Financial Wellness',
            focus: ['Financial habits', 'Spending awareness', 'Goal planning', 'Stress reduction'],
            disclaimer: 'Educational guidance; not professional financial or investment advice.',
            tone: 'slate',
          },
          {
            name: 'Relationships & Family',
            focus: ['Healthy communication', 'Empathy building', 'Family connection', 'Boundary setting'],
            disclaimer: 'Fosters interpersonal understanding and constructive communication.',
            tone: 'rose',
          },
          {
            name: 'Addiction Recovery',
            focus: ['Trigger awareness', 'Daily routine support', 'Relapse education', 'Care navigation'],
            disclaimer: 'A sensitive support aid that must never replace formal medical treatment.',
            tone: 'orange',
          },
        ],
      },
    },
    {
      sectionType: 'principles',
      title: 'Our Core Principles',
      subtitle: 'The foundational ethics that guide every product, technical, and partnership choice',
      badge: 'Guiding Values',
      sortOrder: 6,
      isVisible: true,
      data: {
        items: [
          {
            number: '01',
            title: 'Human-First, Always',
            description:
              'Technology must serve and elevate people, never reduce them to algorithmic metrics or passive data points.',
          },
          {
            number: '02',
            title: 'Privacy & Trust Above All',
            description:
              'Personal experiences demand utmost transparency: clear data storage, user ownership, and zero surveillance.',
          },
          {
            number: '03',
            title: 'Evidence Over Assumptions',
            description:
              'We test ideas scientifically. We clearly distinguish what is proven, what is hypothesised, and what is uncertain.',
          },
          {
            number: '04',
            title: 'Collaboration Over Isolation',
            description:
              'Meaningful outcomes emerge when computer scientists collaborate with counsellors, clinicians, and researchers.',
          },
          {
            number: '05',
            title: 'Progress, Not Perfection',
            description:
              'Personal growth is non-linear. We embrace continuous learning, learn from user feedback, and iterate openly.',
          },
          {
            number: '06',
            title: 'Responsible Innovation',
            description:
              'Novelty is constrained by safety, user dignity, human oversight, and protective clinical boundaries.',
          },
          {
            number: '07',
            title: 'Accessibility & Inclusion',
            description:
              'Self-awareness tools should be intuitive and approachable across diverse cultural backgrounds and abilities.',
          },
          {
            number: '08',
            title: 'Respect User Agency',
            description:
              'Users hold the steering wheel. Technology assists them in making informed, autonomous choices.',
          },
          {
            number: '09',
            title: 'Honest Communication',
            description:
              'We never overpromise AI capabilities. We state product limitations clearly without marketing exaggeration.',
          },
          {
            number: '10',
            title: 'Continuous Learning',
            description:
              'We stay curious, humble, and receptive to evolving research, expert criticism, and community voices.',
          },
        ],
      },
    },
    {
      sectionType: 'ai_humans',
      title: 'AI and Humans: Our Philosophy',
      subtitle: 'AI can assist. Humans understand, care, and connect.',
      badge: 'Human-Centred Philosophy',
      sortOrder: 7,
      isVisible: true,
      data: {
        thesis: 'AI can assist. Humans understand, care, and connect.',
        statement:
          'Sentio Mind is not built to replace therapists, doctors, or human relationships. We build technology that works alongside human expertise, recognizing the strengths and limitations of each.',
        aiAssists: [
          'Guiding structured conversational reflection at any hour',
          'Organising journal entries and highlighting recurring patterns',
          'Providing educational prompts and mindfulness routines',
          'Synthesizing insights from user-provided notes and logs',
          'Navigating users toward appropriate professional resources',
          'Maintaining continuous habit reminders without fatigue',
        ],
        humansProvide: [
          'Deep empathy, compassionate presence, and emotional resonance',
          'Rich contextual understanding of lived human circumstances',
          'Professional clinical discernment, ethics, and diagnosis',
          'Moral accountability and legal duty of care',
          'Genuine interpersonal connection that heals and supports',
          'High-stakes intervention during critical life moments',
        ],
        conclusion:
          'Human behaviour is nuanced and sacred. AI systems can misunderstand context or produce incomplete responses. Responsible software embraces these boundaries and directs users to human connection.',
      },
    },
    {
      sectionType: 'collaboration',
      title: 'Why Collaboration Matters',
      subtitle: 'Building responsible human-centred technology requires a multidisciplinary coalition',
      badge: 'Multidisciplinary Coalition',
      sortOrder: 8,
      isVisible: true,
      data: {
        statement:
          'We cannot build meaningful human-centred technology alone. Real progress demands clinical wisdom, rigorous computer science, and creative excellence working in concert.',
        groups: [
          {
            title: 'AI/ML Researchers & Professors',
            areas: [
              'Natural language processing',
              'Conversational evaluation',
              'Computer vision & video signals',
              'Multimodal AI architectures',
              'Behavioural intelligence modeling',
            ],
          },
          {
            title: 'Psychologists & Counsellors',
            areas: [
              'Tone and conversational safety',
              'Emotional wellbeing content',
              'Screening instrument guidelines',
              'Human care escalation pathways',
              'Clinical ethics review',
            ],
          },
          {
            title: 'Physicians & Healthcare Leaders',
            areas: [
              'Health product validation',
              'Physiological habit guidance',
              'User safety standards',
              'Clinical trial methodology',
              'Preventive wellness protocols',
            ],
          },
          {
            title: 'Universities & Academic Labs',
            areas: [
              'Joint research initiatives',
              'Graduate student internships',
              'Independent validation studies',
              'Open-source scientific exchange',
              'Symposiums & workshops',
            ],
          },
          {
            title: 'Wellness Experts & Audio Creators',
            areas: [
              'Guided audio experiences',
              'Mindful movement curricula',
              'Storytelling and narrative design',
              'Breathwork and stress reduction exercises',
              'Cultural localization',
            ],
          },
        ],
        expectations: [
          'Honest and direct critical feedback',
          'Uncompromising respect for user dignity and privacy',
          'Rigorous domain expertise and factual integrity',
          'Transparent scientific methodology',
          'Shared commitment to non-exploitative, humane technology',
        ],
      },
    },
    {
      sectionType: 'how_we_build',
      title: 'How We Build: Our 5-Step Process',
      subtitle: 'The disciplined, iterative pipeline guiding every feature from conception to release',
      badge: 'Engineering & Craft',
      sortOrder: 9,
      isVisible: true,
      data: {
        steps: [
          {
            step: '01',
            title: 'Understand the Problem',
            description:
              'We begin by deeply understanding real people, their daily stresses, emotional friction, and underlying needs.',
          },
          {
            step: '02',
            title: 'Research & Explore',
            description:
              'We review behavioural science literature, evaluate ML models, and consult clinical experts before writing code.',
          },
          {
            step: '03',
            title: 'Build & Experiment',
            description:
              'We engineer high-fidelity prototypes with tactile UI, robust APIs, and privacy-first database schemas.',
          },
          {
            step: '04',
            title: 'Validate with People',
            description:
              'We run usability tests, collect candid feedback, and perform safety reviews to test assumptions.',
          },
          {
            step: '05',
            title: 'Improve Continuously',
            description:
              'We measure long-term utility, learn from errors, refine prompt safety, and continuously polish craft.',
          },
        ],
      },
    },
    {
      sectionType: 'research_focus',
      title: 'Product & Research Horizons',
      subtitle: 'Key technological domains under active investigation by our engineering and research teams',
      badge: 'R&D Frontiers',
      sortOrder: 10,
      isVisible: true,
      data: {
        areas: [
          {
            title: 'AI and Natural Language Processing',
            points: [
              'Empathetic conversational flow without sycophancy or false attachment',
              'Contextual memory and long-term personal growth summarisation',
              'Rigorous automated safety fences against self-harm or medical advice',
              'Lightweight, privacy-preserving on-device language models',
            ],
          },
          {
            title: 'Image & Video Signal Processing',
            points: [
              'Exploratory research in visual understanding and environmental context',
              'Strict consent-based, privacy-first camera signal processing',
              'Multimodal interactions combining voice, visual prompts, and text',
              'Zero storage of biometric identifiers without explicit encryption',
            ],
          },
          {
            title: 'Humane User Experience & Interaction',
            points: [
              'Design that encourages reflection rather than compulsive screen time',
              'Accessible, high-contrast, calm interfaces adhering to 8pt systems',
              'Micro-typography and tabular numeric clarity for personal tracking',
              'Zero-dark-pattern user agency over account deletion and data export',
            ],
          },
          {
            title: 'Content & Behavioural Curriculum',
            points: [
              'Guided audio journeys for resilience, cognitive reframing, and sleep',
              'Interactive assessment visualizations with clear contextual nuance',
              'Culturally informed reflection prompts in multiple regional languages',
              'Daily rituals balancing mindfulness, breathing, and goal setting',
            ],
          },
        ],
      },
    },
    {
      sectionType: 'new_joiner',
      title: 'New Joiner Guide & Orientation',
      subtitle: 'A clear starting path for every engineer, researcher, and specialist joining the team',
      badge: 'Onboarding Playbook',
      sortOrder: 11,
      isVisible: true,
      data: {
        generalChecklist: [
          'Internalize Our Purpose: Understand why Sentio Mind exists and how your craft serves human wellbeing.',
          'Explore the Complete Suite: Test Senti, Saga, Aura, Rituals, and Assessments firsthand.',
          'Familiarize with the 10 Domains: Review our wellbeing spectrum and safety boundaries.',
          'Study the Anti-AI-Slop Rules: Champion institutional precision, authentic design, and clean typography.',
          'Know Your Responsibilities: Understand your scope, deliverables, and collaboration channels in LeadWise.',
          'Ask Thoughtful Questions: Curiosity and respectful critique are actively encouraged.',
          'Act on Feedback: View criticism as the highest leverage catalyst for product excellence.',
        ],
        roleTracks: [
          {
            role: 'Software Engineers',
            checklist: [
              'Inspect the Next.js App Router, Prisma ORM, and PostgreSQL architecture.',
              'Adhere to strict RBAC standards: never trust client-side role claims.',
              'Ensure zero unhandled exceptions and maintain exhaustive Zod schema validation.',
              'Verify dark/light theme tokens and follow zero-slop UI/UX principles.',
              'Write automated tests for all data mutations and security paths.',
            ],
          },
          {
            role: 'AI / ML Researchers',
            checklist: [
              'Align all models with emotional safety and clinical boundary protocols.',
              'Evaluate prompts and models against bias, hallucination, and medical claims.',
              'Work closely with psychologists to refine conversational nuance and boundaries.',
              'Respect privacy: never train models on unconsented private user journals.',
              'Document evaluation metrics and distinguish research from live features.',
            ],
          },
          {
            role: 'Domain Specialists & Counsellors',
            checklist: [
              'Review conversation flows for tone, empathy, and potential triggers.',
              'Help refine criteria for when software should suggest seeking professional care.',
              'Verify that screening tools (PHQ-9, GAD-7) present appropriate guidance.',
              'Contribute educational content for Daily Rituals and guided exercises.',
              'Ensure all claims accurately reflect current behavioural science.',
            ],
          },
        ],
      },
    },
    {
      sectionType: 'journey',
      title: 'Our Journey & Milestones',
      subtitle: 'Documented progress and planned horizons (only verified milestones are represented)',
      badge: 'Milestone Roadmap',
      sortOrder: 12,
      isVisible: true,
      data: {
        items: [
          {
            title: 'Platform Concept & Foundational Research',
            status: 'Completed',
            category: 'Foundation',
            description:
              'Initial conceptualization of bridging conversational AI with structured personal reflection and behavioural insights.',
          },
          {
            title: 'Senti Companion & Saga Journal Prototype',
            status: 'Completed',
            category: 'Core Product',
            description:
              'Prototyping core conversational flows, private encryption for personal journals, and daily ritual prompts.',
          },
          {
            title: 'LeadWise CRM & Living Handbook Integration',
            status: 'Live',
            category: 'Infrastructure',
            description:
              'Deployment of editable CMS handbook inside LeadWise resources, empowering Lead and Owner to govern knowledge.',
          },
          {
            title: 'Multimodal Behavioural Intelligence Research',
            status: 'In Development',
            category: 'Research',
            description:
              'Evaluating responsible computer vision and video analysis for behavioural signals with strict user consent.',
          },
          {
            title: 'Professional Human Care & Counsellor Discovery',
            status: 'Planned',
            category: 'Partnership',
            description:
              'Building verified pathways to connect self-awareness routines with qualified therapists and healthcare partners.',
          },
        ],
      },
    },
    {
      sectionType: 'cta',
      title: "Let's Build Something Meaningful Together",
      subtitle:
        'We welcome dialogue with researchers, professors, clinicians, developers, and academic institutions',
      badge: 'Collaboration Gateway',
      content:
        'If your research, clinical expertise, or creative practice aligns with Sentio Mind, we would love to connect. Together, we can shape technology that supports self-awareness with dignity, rigor, and care.',
      sortOrder: 13,
      isVisible: true,
      data: {
        primaryAction: {
          label: 'Explore Collaboration Opportunities',
          targetId: 'collaboration',
        },
        secondaryAction: {
          label: 'Contact the Sentio Mind Team',
          email: 'harsh@sentio.in',
        },
        governanceNote:
          'This handbook is a living document maintained by Lead and Owner. Content is updated as research evolves and features are verified.',
      },
    },
  ],
}
