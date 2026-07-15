export type Language = "en" | "sw"

export const translations = {
  en: {
    // Landing page
    landingSubtitle:
      "An inclusive platform connecting people with disabilities to live events, current affairs, and meaningful conversations",
    createAccount: "Create Account",
    signIn: "Sign In",
    worksOffline: "Works Offline",
    worksOfflineDesc:
      "Designed for areas with limited connectivity. Your data syncs when you're back online.",
    readyToConnect: "Ready to Connect?",
    readyToConnectDesc:
      "Join our inclusive community and start engaging with events and conversations that matter to you.",
    builtForEveryone: "Built for Everyone",
    productOf: "A product of",
    gdaFullName: "Grassroots Disability Agenda",
    // Feature cards
    liveEvents: "Live Events",
    liveEventsDesc: "Discover and join accessible events tailored for your needs",
    currentAffairs: "Current Affairs",
    currentAffairsDesc: "Stay informed with accessible news and discussions",
    secureChat: "Secure Chat",
    secureChatDesc: "Connect privately with peers in a safe environment",
    community: "Community",
    communityDesc: "Build meaningful connections with others who understand",
    // Accessibility section
    visualAccessibility: "Visual Accessibility",
    motorCognitive: "Motor & Cognitive",
    // Navigation
    navigation: "Navigation",
    messages: "Messages",
    events: "Events",
    news: "Current Affairs",
    resources: "Resources",
    profile: "Profile",
    signOut: "Sign Out",
    openMenu: "Open navigation menu",
    welcome: "Welcome",
    // Resources
    resourcesTitle: "Disability Resources",
    resourcesSubtitle: "Information and support for people with disabilities in Kenya and East Africa",
    searchResources: "Search resources...",
    allCategories: "All Categories",
    resourcesLegalRights: "Legal Rights",
    resourcesHealth: "Health & Medical",
    resourcesAssistiveTech: "Assistive Technology",
    resourcesEducation: "Education",
    resourcesEmployment: "Employment",
    resourcesHousing: "Housing & Transport",
    resourcesFinancial: "Financial Support",
    resourcesDisabilityTypes: "Understanding Disabilities",
    learnMore: "Learn More",
    visitWebsite: "Visit Website",
    callNow: "Call Now",
    // Chatbot
    chatbotButtonLabel: "Chat with Abilibot",
    chatbotTitle: "Abilibot",
    chatbotOnline: "Online",
    chatbotPlaceholder: "Type your question...",
    chatbotSend: "Send message",
    chatbotGreeting:
      "Hello! I'm Abilibot, your AI assistant for Abilispace. I can help with disability rights, GDA services, platform features, and more. What would you like to know?",
    chatbotClose: "Close chat",
    // Language
    switchTo: "Kiswahili",
  },
  sw: {
    // Landing page
    landingSubtitle:
      "Jukwaa jumuishi linaloounganisha watu wenye ulemavu na matukio ya moja kwa moja, habari za sasa, na mazungumzo ya maana",
    createAccount: "Fungua Akaunti",
    signIn: "Ingia",
    worksOffline: "Inafanya Kazi Bila Mtandao",
    worksOfflineDesc:
      "Imeundwa kwa maeneo yenye muunganisho mdogo. Data yako inasawazishwa unapowasha mtandao.",
    readyToConnect: "Uko Tayari Kuungana?",
    readyToConnectDesc:
      "Jiunge na jamii yetu na uanze kushiriki katika matukio na mazungumzo yanayokufaa.",
    builtForEveryone: "Imejengwa kwa Kila Mtu",
    productOf: "Bidhaa ya",
    gdaFullName: "Grassroots Disability Agenda",
    // Feature cards
    liveEvents: "Matukio ya Moja kwa Moja",
    liveEventsDesc: "Gundua na ujiunga na matukio yanayofaa mahitaji yako",
    currentAffairs: "Habari za Sasa",
    currentAffairsDesc: "Endelea kufahamishwa na habari na majadiliano yanayopatikana",
    secureChat: "Mazungumzo Salama",
    secureChatDesc: "Unganika kwa siri na wenzako katika mazingira salama",
    community: "Jamii",
    communityDesc: "Jenga mahusiano ya maana na wengine wanaokuelewa",
    // Accessibility section
    visualAccessibility: "Upatikanaji wa Kuona",
    motorCognitive: "Mwendo na Utambuzi",
    // Navigation
    navigation: "Urambazaji",
    messages: "Ujumbe",
    events: "Matukio",
    news: "Habari za Sasa",
    resources: "Rasilimali",
    profile: "Wasifu",
    signOut: "Toka",
    openMenu: "Fungua menyu ya urambazaji",
    welcome: "Karibu",
    // Resources
    resourcesTitle: "Rasilimali za Ulemavu",
    resourcesSubtitle: "Taarifa na msaada kwa watu wenye ulemavu Kenya na Afrika Mashariki",
    searchResources: "Tafuta rasilimali...",
    allCategories: "Makundi Yote",
    resourcesLegalRights: "Haki za Kisheria",
    resourcesHealth: "Afya na Matibabu",
    resourcesAssistiveTech: "Teknolojia Msaidizi",
    resourcesEducation: "Elimu",
    resourcesEmployment: "Ajira",
    resourcesHousing: "Makazi na Usafiri",
    resourcesFinancial: "Msaada wa Kifedha",
    resourcesDisabilityTypes: "Kuelewa Ulemavu",
    learnMore: "Jifunza Zaidi",
    visitWebsite: "Tembelea Tovuti",
    callNow: "Piga Simu Sasa",
    // Chatbot
    chatbotButtonLabel: "Zungumza na Abilibot",
    chatbotTitle: "Abilibot",
    chatbotOnline: "Mtandaoni",
    chatbotPlaceholder: "Andika swali lako...",
    chatbotSend: "Tuma ujumbe",
    chatbotGreeting:
      "Habari! Mimi ni Abilibot, msaidizi wako wa AI kwa Abilispace. Naweza kusaidia na haki za ulemavu, huduma za GDA, vipengele vya jukwaa, na zaidi. Ungependa kujua nini?",
    chatbotClose: "Funga mazungumzo",
    // Language
    switchTo: "English",
  },
} as const

export type TranslationKey = keyof typeof translations.en
