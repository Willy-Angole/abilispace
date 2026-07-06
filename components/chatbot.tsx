"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X, Send, Bot, User } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { type Language } from "@/lib/translations"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "bot"
  text: string
  timestamp: Date
}

// ---------------------------------------------------------------------------
// Keyword-based response engine
// ---------------------------------------------------------------------------
interface Rule {
  keywords: string[]
  answer: { en: string; sw: string }
}

const RULES: Rule[] = [
  {
    keywords: ["hello", "hi", "habari", "hujambo", "hey", "greet"],
    answer: {
      en: "Hello! 👋 How can I help you today? You can ask me about disability rights, GDA services, Abilispace features, or health and education resources.",
      sw: "Habari! 👋 Naweza kukusaidia nini leo? Unaweza kuniuliza kuhusu haki za ulemavu, huduma za GDA, vipengele vya Abilispace, au rasilimali za afya na elimu.",
    },
  },
  {
    keywords: ["gda", "grassroots", "disability agenda", "organization", "owner"],
    answer: {
      en: "GDA (Grassroots Disability Agenda) is a Kenyan organization empowering persons with disabilities through advocacy, community engagement, and accessible digital tools. Abilispace is GDA's platform. Visit grassrootsdisability.org to learn more.",
      sw: "GDA (Grassroots Disability Agenda) ni shirika la Kenya linaloimarisha watu wenye ulemavu kupitia utetezi, ushirikiano wa jamii, na zana za kidijitali. Abilispace ni jukwaa la GDA. Tembelea grassrootsdisability.org kujua zaidi.",
    },
  },
  {
    keywords: ["abilispace", "shiriki", "platform", "what is", "about"],
    answer: {
      en: "Abilispace (Shiriki) is an inclusive community platform by GDA that connects persons with disabilities to live events, current affairs, and secure peer messaging — all with comprehensive accessibility features.",
      sw: "Abilispace (Shiriki) ni jukwaa jumuishi la jamii la GDA linaloounganisha watu wenye ulemavu na matukio ya moja kwa moja, habari za sasa, na ujumbe salama — yote yenye vipengele kamili vya upatikanaji.",
    },
  },
  {
    keywords: ["register", "sign up", "create account", "join", "fungua", "akaunti", "jiunge"],
    answer: {
      en: "To register, click 'Create Account' on the homepage. Fill in your name, email, and set a password. You can also indicate your disability type and accessibility needs so we can personalise your experience.",
      sw: "Ili kusajili, bonyeza 'Fungua Akaunti' kwenye ukurasa wa nyumbani. Jaza jina lako, barua pepe, na weka nenosiri. Unaweza pia kuonyesha aina yako ya ulemavu ili kuboresha uzoefu wako.",
    },
  },
  {
    keywords: ["event", "matukio", "live", "calendar", "activity"],
    answer: {
      en: "You can discover and join accessible events in the 'Events' tab of your dashboard. Events are filtered for accessibility and you can search by category, date, or location.",
      sw: "Unaweza kugundua na kujiunga na matukio yanayoweza kupatikana kwenye kichupo 'Matukio' cha dashibodi yako. Matukio yamechujwa kwa upatikanaji na unaweza kutafuta kwa kategoria, tarehe, au eneo.",
    },
  },
  {
    keywords: ["news", "current affairs", "habari", "article", "read"],
    answer: {
      en: "The 'Current Affairs' tab gives you accessible news, articles, and discussions relevant to disability, policy, health, and community. You can search, bookmark, and filter by category or region.",
      sw: "Kichupo 'Habari za Sasa' kinakupa habari, makala, na majadiliano yanayohusiana na ulemavu, sera, afya, na jamii. Unaweza kutafuta, kuweka alama, na kuchuja kwa kategoria au mkoa.",
    },
  },
  {
    keywords: ["message", "chat", "messaging", "ujumbe", "zungumza", "peer"],
    answer: {
      en: "Use the 'Messages' tab to chat securely with other community members. Messages are end-to-end encrypted for your privacy.",
      sw: "Tumia kichupo 'Ujumbe' kuzungumza kwa usalama na wanachama wengine wa jamii. Ujumbe umesimbwa kwa faragha yako.",
    },
  },
  {
    keywords: ["resource", "rasilimali", "information", "guide", "help", "support"],
    answer: {
      en: "The 'Resources' tab has disability information covering legal rights, health, assistive technology, education, employment, housing, and financial support in Kenya and East Africa.",
      sw: "Kichupo 'Rasilimali' kina taarifa za ulemavu zinazoshughulikia haki za kisheria, afya, teknolojia msaidizi, elimu, ajira, makazi, na msaada wa kifedha Kenya na Afrika Mashariki.",
    },
  },
  {
    keywords: ["rights", "law", "legal", "act", "haki", "sheria", "constitution", "katiba"],
    answer: {
      en: "In Kenya, the Persons with Disabilities Act (Cap. 133) and the Constitution (Article 54) protect your rights. Key rights include: 5% employment quota in government jobs, tax exemptions, free assistive devices, accessible education, and anti-discrimination protections. Check the Resources tab for details.",
      sw: "Kenya, Sheria ya Watu Wenye Ulemavu (Sura 133) na Katiba (Ibara 54) inalinda haki zako. Haki kuu ni: kota ya 5% ya ajira ya serikali, msamaha wa kodi, vifaa vya kusaidia bure, elimu inayopatikana, na ulinzi dhidi ya ubaguzi. Angalia kichupo cha Rasilimali kwa maelezo.",
    },
  },
  {
    keywords: ["ncpwd", "disability card", "kadi", "register disability", "government"],
    answer: {
      en: "NCPWD (National Council for Persons with Disabilities) is Kenya's official body for disability registration. Register to get a disability card which gives you access to tax exemptions, assistive devices, and government support. Call +254 20 2712557 or visit ncpwd.go.ke.",
      sw: "NCPWD (Baraza la Kitaifa la Watu Wenye Ulemavu) ni chombo rasmi cha Kenya cha usajili wa ulemavu. Sajili kupata kadi ya ulemavu inayokupa upatikanaji wa msamaha wa kodi, vifaa vya kusaidia, na msaada wa serikali. Piga simu +254 20 2712557 au tembelea ncpwd.go.ke.",
    },
  },
  {
    keywords: ["wheelchair", "crutch", "hearing aid", "white cane", "prosthetic", "device", "vifaa", "kiti"],
    answer: {
      en: "Registered PWDs in Kenya can apply for free or subsidised assistive devices — including wheelchairs, hearing aids, white canes, and crutches — through the NCPWD Assistive Devices Programme. Contact NCPWD at +254 20 2712557.",
      sw: "Watu wenye ulemavu waliosajiliwa Kenya wanaweza kuomba vifaa vya kusaidia bure au kwa bei nafuu — ikiwemo viti vya magurudumu, visaidizi vya kusikia, fimbo nyeupe, na mikongojo — kupitia Programu ya Vifaa Vya Kusaidia ya NCPWD. Wasiliana na NCPWD kwa +254 20 2712557.",
    },
  },
  {
    keywords: ["job", "employment", "work", "career", "ajira", "kazi"],
    answer: {
      en: "Kenya law reserves 5% of government jobs for PWDs. NCPWD can help with job placement. Vocational training centres offer skills training in ICT, tailoring, carpentry and more. Check the Resources tab under Employment for more.",
      sw: "Sheria ya Kenya inahifadhi 5% ya kazi za serikali kwa watu wenye ulemavu. NCPWD inaweza kusaidia kuweka kazi. Vituo vya mafunzo ya ufundi hutoa mafunzo ya ujuzi wa TEHAMA, ushonaji, useremala na zaidi. Angalia kichupo cha Rasilimali chini ya Ajira.",
    },
  },
  {
    keywords: ["education", "school", "university", "kise", "elimu", "shule", "chuo"],
    answer: {
      en: "KISE (Kenya Institute of Special Education) provides special needs education and assessment. Most Kenyan universities have disability support units for students. The Constitution guarantees your right to education. Check the Resources tab for more.",
      sw: "KISE (Taasisi ya Kenya ya Elimu Maalum) hutoa elimu maalum na tathmini. Vyuo vikuu vingi vya Kenya vina vitengo vya msaada kwa wanafunzi wenye ulemavu. Katiba inahakikisha haki yako ya elimu. Angalia kichupo cha Rasilimali kwa zaidi.",
    },
  },
  {
    keywords: ["mental health", "depression", "anxiety", "afya ya akili", "msongo", "stress"],
    answer: {
      en: "Mental health is an important disability concern. Befrienders Kenya offers a free confidential helpline: +254 722 178 177. Don't hesitate to reach out — support is available.",
      sw: "Afya ya akili ni suala muhimu la ulemavu. Befrienders Kenya inatoa simu ya msaada ya bure na ya siri: +254 722 178 177. Usisita kufikia — msaada unapatikana.",
    },
  },
  {
    keywords: ["swahili", "kiswahili", "language", "lugha", "translate", "english"],
    answer: {
      en: "You can switch the platform language to Kiswahili using the language button in the top navigation bar. The platform supports both English and Kiswahili.",
      sw: "Unaweza kubadilisha lugha ya jukwaa hadi Kiingereza ukitumia kitufe cha lugha kwenye mwambaa wa urambazaji juu. Jukwaa linasaidia Kiingereza na Kiswahili.",
    },
  },
  {
    keywords: ["offline", "no internet", "bila mtandao", "connectivity"],
    answer: {
      en: "Abilispace is designed to work offline! It caches content and syncs your data automatically when you reconnect. This is especially helpful in areas with limited connectivity.",
      sw: "Abilispace imeundwa kufanya kazi bila mtandao! Inakumbuka maudhui na kusawazisha data yako kiotomatiki unapowasha mtandao. Hii ni muhimu sana katika maeneo yenye muunganisho mdogo.",
    },
  },
  {
    keywords: ["accessibility", "screen reader", "high contrast", "keyboard", "upatikanaji"],
    answer: {
      en: "Abilispace has full accessibility support: high contrast mode, screen reader optimisation (ARIA labels), full keyboard navigation, scalable text, and voice command support. Use the accessibility floating button to toggle these settings.",
      sw: "Abilispace ina msaada kamili wa upatikanaji: hali ya utofauti wa juu, uboreshaji wa msomaji wa skrini (lebo za ARIA), urambazaji kamili wa kibodi, maandishi yanayoweza kupanuka, na msaada wa amri za sauti.",
    },
  },
  {
    keywords: ["pwa", "app", "mobile", "android", "ios", "install", "programu"],
    answer: {
      en: "Abilispace is a Progressive Web App (PWA) — you can install it on your Android or iOS device directly from your browser. Look for 'Add to Home Screen' in your browser menu. It works offline too!",
      sw: "Abilispace ni Programu ya Wavuti ya Maendeleo (PWA) — unaweza kuisakinisha kwenye kifaa chako cha Android au iOS moja kwa moja kutoka kwa kivinjari chako. Tafuta 'Ongeza kwenye Skrini ya Nyumbani' kwenye menyu ya kivinjari chako. Pia inafanya kazi bila mtandao!",
    },
  },
  {
    keywords: ["tax", "kodi", "exemption", "kra", "relief"],
    answer: {
      en: "Registered PWDs in Kenya are entitled to income tax relief and import duty exemption on assistive devices. Apply through the Kenya Revenue Authority (KRA) using your NCPWD disability card.",
      sw: "Watu wenye ulemavu waliosajiliwa Kenya wana haki ya kupunguzwa kodi ya mapato na msamaha wa ushuru wa uagizaji wa vifaa vya kusaidia. Omba kupitia Mamlaka ya Mapato Kenya (KRA) ukitumia kadi yako ya ulemavu ya NCPWD.",
    },
  },
]

const FALLBACK: Record<Language, string> = {
  en: "I'm not sure about that. You can check the **Resources** tab for detailed information, or visit [grassrootsdisability.org](https://grassrootsdisability.org) for more GDA services. You can also ask me about: disability rights, events, news, messaging, resources, jobs, education, or accessibility features.",
  sw: "Sijui kuhusu hilo. Unaweza kuangalia kichupo cha **Rasilimali** kwa taarifa za kina, au tembelea [grassrootsdisability.org](https://grassrootsdisability.org) kwa huduma zaidi za GDA. Unaweza pia kuniuliza kuhusu: haki za ulemavu, matukio, habari, ujumbe, rasilimali, ajira, elimu, au vipengele vya upatikanaji.",
}

function getBotResponse(input: string, language: Language): string {
  const lower = input.toLowerCase()
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.answer[language]
    }
  }
  return FALLBACK[language]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function Chatbot() {
  const { language, t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialise greeting when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "greeting",
          role: "bot",
          text: t("chatbotGreeting"),
          timestamp: new Date(),
        },
      ])
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-set greeting when language changes
  useEffect(() => {
    if (messages.length > 0 && messages[0].id === "greeting") {
      setMessages((prev) => [
        { ...prev[0], text: t("chatbotGreeting") },
        ...prev.slice(1),
      ])
    }
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date(),
    }

    const botMsg: Message = {
      id: `b-${Date.now()}`,
      role: "bot",
      text: getBotResponse(text, language),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg, botMsg])
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={t("chatbotButtonLabel")}
        aria-expanded={isOpen}
        className={cn(
          "fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
          "bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          isOpen && "rotate-90 bg-muted text-foreground hover:bg-muted/90"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={t("chatbotTitle")}
          className={cn(
            "fixed bottom-36 right-4 z-50 w-80 sm:w-96 rounded-xl shadow-2xl border bg-background",
            "flex flex-col overflow-hidden"
          )}
          style={{ maxHeight: "70vh" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t("chatbotTitle")}</p>
              <p className="text-xs opacity-80">{t("chatbotOnline")}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsOpen(false)}
              aria-label={t("chatbotClose")}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex items-end gap-2", msg.role === "user" && "flex-row-reverse")}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs",
                      msg.role === "bot" ? "bg-primary" : "bg-muted-foreground"
                    )}
                    aria-hidden="true"
                  >
                    {msg.role === "bot" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </div>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      msg.role === "bot"
                        ? "bg-muted text-foreground rounded-bl-sm"
                        : "bg-primary text-primary-foreground rounded-br-sm"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex gap-2 border-t px-3 py-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chatbotPlaceholder")}
              className="flex-1 h-9 text-sm"
              aria-label={t("chatbotPlaceholder")}
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={sendMessage}
              disabled={!input.trim()}
              aria-label={t("chatbotSend")}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
