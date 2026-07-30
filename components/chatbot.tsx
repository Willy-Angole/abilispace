"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X, Send, Bot, User, Sparkles, WifiOff } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { type Language } from "@/lib/translations"
import { cn } from "@/lib/utils"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface Message {
  id: string
  role: "user" | "bot"
  text: string
  timestamp: Date
  isAI?: boolean
}

// ---------------------------------------------------------------------------
// Keyword fallback engine — used when Gemini is unavailable
// ---------------------------------------------------------------------------
interface Rule { keywords: string[]; answer: { en: string; sw: string } }

const RULES: Rule[] = [
  {
    keywords: ["hello", "hi", "habari", "hujambo", "hey", "greet"],
    answer: {
      en: "Hello! 👋 I'm Abili, your AI assistant. Ask me anything about disability rights, GDA services, Abilispace features, or finding support in Kenya.",
      sw: "Habari! 👋 Mimi ni Abili, msaidizi wako wa AI. Niulize chochote kuhusu haki za ulemavu, huduma za GDA, vipengele vya Abilispace, au kupata msaada Kenya.",
    },
  },
  {
    keywords: ["gda", "grassroots", "disability agenda", "organization", "owner"],
    answer: {
      en: "GDA (Grassroots Disability Agenda) is a Kenyan organisation empowering persons with disabilities through advocacy, community engagement, and accessible digital tools. Abilispace is GDA's platform. Visit grassrootsdisability.org to learn more.",
      sw: "GDA (Grassroots Disability Agenda) ni shirika la Kenya linaloimarisha watu wenye ulemavu kupitia utetezi, ushirikiano wa jamii, na zana za kidijitali. Abilispace ni jukwaa la GDA. Tembelea grassrootsdisability.org kujua zaidi.",
    },
  },
  {
    keywords: ["abilispace", "shiriki", "platform", "what is", "about"],
    answer: {
      en: "Abilispace is an inclusive community platform by GDA connecting persons with disabilities to live events, current affairs, secure messaging, and disability resources — all with full accessibility features.",
      sw: "Abilispace ni jukwaa jumuishi la jamii la GDA linaloounganisha watu wenye ulemavu na matukio, habari, ujumbe salama, na rasilimali za ulemavu — yote yenye vipengele kamili vya upatikanaji.",
    },
  },
  {
    keywords: ["event", "matukio", "live", "calendar", "activity"],
    answer: {
      en: "Discover accessible events in the 'Events' tab on your dashboard. Filter by category, date, or location.",
      sw: "Gundua matukio kwenye kichupo 'Matukio' kwenye dashibodi yako. Chuja kwa kategoria, tarehe, au eneo.",
    },
  },
  {
    keywords: ["news", "current affairs", "habari", "article", "read"],
    answer: {
      en: "The 'Current Affairs' tab gives you accessible news and articles on disability, policy, health, and community.",
      sw: "Kichupo 'Habari za Sasa' kinakupa habari na makala yanayohusiana na ulemavu, sera, afya, na jamii.",
    },
  },
  {
    keywords: ["message", "chat", "messaging", "ujumbe", "zungumza", "peer"],
    answer: {
      en: "Use the 'Messages' tab to chat securely with community members over HTTPS. (Messages are server-mediated, not end-to-end encrypted.)",
      sw: "Tumia kichupo 'Ujumbe' kuzungumza kwa usalama na wanachama kupitia HTTPS. (Ujumbe hupitia seva; si usimbaji wa mwisho-hadi-mwisho.)",
    },
  },
  {
    keywords: ["resource", "rasilimali", "information", "guide", "help", "support"],
    answer: {
      en: "The 'Resources' tab covers disability legal rights, health, assistive technology, education, employment, and housing in Kenya and East Africa.",
      sw: "Kichupo 'Rasilimali' kinashughulikia haki za kisheria, afya, teknolojia msaidizi, elimu, ajira, na makazi Kenya na Afrika Mashariki.",
    },
  },
  {
    keywords: ["rights", "law", "legal", "act", "haki", "sheria", "constitution", "katiba"],
    answer: {
      en: "The Persons with Disabilities Act (Cap. 133) and Constitution Article 54 protect PWD rights in Kenya — including 5% government employment quota, tax exemptions, free assistive devices, and anti-discrimination protections.",
      sw: "Sheria ya Watu Wenye Ulemavu (Sura 133) na Katiba Ibara 54 inalinda haki za watu wenye ulemavu Kenya — ikiwemo kota ya 5% ya ajira ya serikali, msamaha wa kodi, na vifaa vya kusaidia bure.",
    },
  },
  {
    keywords: ["ncpwd", "disability card", "kadi", "register disability", "government"],
    answer: {
      en: "NCPWD is Kenya's official disability registration body. Registering gives you a disability card for tax exemptions, assistive devices, and government support. Call +254 20 2712557 or visit ncpwd.go.ke.",
      sw: "NCPWD ni chombo rasmi cha usajili wa ulemavu Kenya. Sajili kupata kadi ya ulemavu kwa msamaha wa kodi, vifaa, na msaada wa serikali. Piga +254 20 2712557 au tembelea ncpwd.go.ke.",
    },
  },
  {
    keywords: ["wheelchair", "hearing aid", "white cane", "prosthetic", "device", "vifaa", "kiti"],
    answer: {
      en: "Registered PWDs can apply for free assistive devices — wheelchairs, hearing aids, white canes, crutches — through the NCPWD Assistive Devices Programme (+254 20 2712557).",
      sw: "Watu wenye ulemavu waliosajiliwa wanaweza kuomba vifaa vya kusaidia bure kupitia Programu ya Vifaa ya NCPWD (+254 20 2712557).",
    },
  },
  {
    keywords: ["job", "employment", "work", "career", "ajira", "kazi"],
    answer: {
      en: "Kenya law reserves 5% of government jobs for PWDs. NCPWD offers job placement, and vocational centres provide ICT, tailoring, and carpentry training. Check the Resources tab.",
      sw: "Sheria ya Kenya inahifadhi 5% ya kazi za serikali kwa watu wenye ulemavu. Angalia kichupo cha Rasilimali chini ya Ajira.",
    },
  },
  {
    keywords: ["education", "school", "university", "kise", "elimu", "shule", "chuo"],
    answer: {
      en: "The Constitution guarantees your right to education. KISE provides special needs education, and most universities have disability support units.",
      sw: "Katiba inahakikisha haki yako ya elimu. KISE hutoa elimu maalum, na vyuo vikuu vingi vina vitengo vya msaada.",
    },
  },
  {
    keywords: ["mental health", "depression", "anxiety", "afya ya akili", "msongo", "stress"],
    answer: {
      en: "Mental health matters. Befrienders Kenya offers a free confidential helpline: +254 722 178 177. Please reach out — support is available.",
      sw: "Afya ya akili ni muhimu. Befrienders Kenya inatoa simu ya msaada ya bure: +254 722 178 177. Tafadhali wasiliana — msaada unapatikana.",
    },
  },
  {
    keywords: ["tax", "kodi", "exemption", "kra", "relief"],
    answer: {
      en: "Registered PWDs qualify for income tax relief and import duty exemptions on assistive devices. Apply through Kenya Revenue Authority (KRA) using your NCPWD card.",
      sw: "Watu wenye ulemavu waliosajiliwa wana haki ya msamaha wa kodi ya mapato. Omba kupitia KRA ukitumia kadi yako ya NCPWD.",
    },
  },
  {
    keywords: ["accessibility", "screen reader", "high contrast", "keyboard", "upatikanaji"],
    answer: {
      en: "Abilispace has full accessibility: high-contrast mode, screen reader optimisation, keyboard navigation, scalable text, and voice command support.",
      sw: "Abilispace ina msaada kamili wa upatikanaji: utofauti wa juu, msomaji wa skrini, urambazaji wa kibodi, na maandishi yanayoweza kupanuka.",
    },
  },
]

const FALLBACK: Record<Language, string> = {
  en: "I'm not sure about that. Check the **Resources** tab or visit grassrootsdisability.org. You can also ask me about disability rights, events, news, messaging, resources, jobs, or education.",
  sw: "Sijui kuhusu hilo. Angalia kichupo cha **Rasilimali** au tembelea grassrootsdisability.org.",
}

function getKeywordResponse(input: string, language: Language): string {
  const lower = input.toLowerCase()
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.answer[language]
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
  const [isTyping, setIsTyping] = useState(false)
  const [usingAI, setUsingAI] = useState<boolean | null>(null) // null = unknown yet
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: "greeting",
        role: "bot",
        text: t("chatbotGreeting"),
        timestamp: new Date(),
        isAI: true,
      }])
    }
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length > 0 && messages[0].id === "greeting") {
      setMessages((prev) => [{ ...prev[0], text: t("chatbotGreeting") }, ...prev.slice(1)])
    }
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isTyping) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    try {
      // Build history for Gemini (exclude greeting, last 10 turns)
      const history = messages
        .filter(m => m.id !== "greeting")
        .slice(-10)
        .map(m => ({ role: m.role === "user" ? "user" : "model" as const, content: m.text }))

      const { getAccessToken } = await import("@/lib/auth")
      const token = getAccessToken()
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, language, history }),
        credentials: "include",
        signal: AbortSignal.timeout(15000),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && !data.fallback && data.reply) {
          setUsingAI(true)
          setMessages((prev) => [...prev, {
            id: `b-${Date.now()}`,
            role: "bot",
            text: data.reply,
            timestamp: new Date(),
            isAI: true,
          }])
          return
        }
      }
    } catch {
      // Network error or timeout — fall through to keyword
    } finally {
      setIsTyping(false)
    }

    // Keyword fallback
    setUsingAI(false)
    setMessages((prev) => [...prev, {
      id: `b-${Date.now()}`,
      role: "bot",
      text: getKeywordResponse(text, language),
      timestamp: new Date(),
      isAI: false,
    }])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <>
      {/* Floating toggle */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={t("chatbotButtonLabel")}
        aria-expanded={isOpen}
        className={cn(
          "fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-none border border-border flex items-center justify-center transition-all duration-200",
          "bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          isOpen && "rotate-90 bg-muted text-muted-foreground hover:bg-muted/90"
        )}
      >
        {isOpen ? <X className="h-6 w-6" aria-hidden /> : <MessageCircle className="h-6 w-6" aria-hidden />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={t("chatbotTitle")}
          className="fixed bottom-36 right-4 z-50 w-80 sm:w-96 rounded-xl shadow-none border border-border bg-card text-card-foreground flex flex-col overflow-hidden"
          style={{ maxHeight: "70vh" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
              <Bot className="h-4 w-4" aria-hidden />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                {t("chatbotTitle")}
                {usingAI === true && <Sparkles className="h-3 w-3 opacity-80" aria-label="Powered by Gemini AI" />}
                {usingAI === false && <WifiOff className="h-3 w-3 opacity-60" aria-label="Offline mode" />}
              </p>
              <p className="text-xs opacity-80">
                {usingAI === true ? "Powered by Gemini AI" : usingAI === false ? "Offline mode" : t("chatbotOnline")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsOpen(false)}
              aria-label={t("chatbotClose")}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex items-end gap-2", msg.role === "user" && "flex-row-reverse")}>
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs",
                      msg.role === "bot"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                    aria-hidden
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

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-end gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden>
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1" aria-label="Abili is typing">
                    <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
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
              disabled={isTyping}
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              aria-label={t("chatbotSend")}
            >
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
