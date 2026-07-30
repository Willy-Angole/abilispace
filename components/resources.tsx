"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Scale,
  Heart,
  Monitor,
  GraduationCap,
  Briefcase,
  Home,
  DollarSign,
  Brain,
  Search,
  ExternalLink,
  Phone,
} from "lucide-react"
import { useLanguage } from "@/components/language-provider"

interface Resource {
  id: string
  title: string
  titleSw: string
  description: string
  descriptionSw: string
  category: string
  tags: string[]
  contact?: string
  website?: string
  type: "organization" | "guide" | "hotline" | "legal"
}

const RESOURCES: Resource[] = [
  // Legal Rights
  {
    id: "ncpwd",
    title: "National Council for Persons with Disabilities (NCPWD)",
    titleSw: "Baraza la Kitaifa la Watu Wenye Ulemavu (NCPWD)",
    description:
      "The official government body that registers persons with disabilities, issues disability cards, and coordinates disability services in Kenya.",
    descriptionSw:
      "Chombo rasmi cha serikali kinachosajili watu wenye ulemavu, kutoa kadi za ulemavu, na kuratibu huduma za ulemavu Kenya.",
    category: "legal",
    tags: ["registration", "disability card", "government", "Kenya"],
    contact: "+254 20 2712557",
    website: "https://ncpwd.go.ke",
    type: "organization",
  },
  {
    id: "pwd-act",
    title: "Persons with Disabilities Act (Cap. 133)",
    titleSw: "Sheria ya Watu Wenye Ulemavu (Sura 133)",
    description:
      "Kenya's primary law protecting the rights of persons with disabilities, covering employment, education, accessibility, and anti-discrimination provisions.",
    descriptionSw:
      "Sheria kuu ya Kenya inayolinda haki za watu wenye ulemavu, inayoshughulikia ajira, elimu, upatikanaji, na masharti ya kupinga ubaguzi.",
    category: "legal",
    tags: ["law", "rights", "anti-discrimination", "Kenya"],
    website: "https://ncpwd.go.ke/disability-mainstreaming/legislation/",
    type: "legal",
  },
  {
    id: "constitution",
    title: "Constitution of Kenya 2010 – Disability Rights",
    titleSw: "Katiba ya Kenya 2010 – Haki za Ulemavu",
    description:
      "Article 54 of Kenya's Constitution guarantees the right to access education, rehabilitation, state support, and reasonable access to places and services.",
    descriptionSw:
      "Ibara ya 54 ya Katiba ya Kenya inahakikisha haki ya kupata elimu, ukarabati, msaada wa serikali, na upatikanaji wa makazi na huduma.",
    category: "legal",
    tags: ["constitution", "rights", "education", "rehabilitation"],
    type: "legal",
  },
  // Health & Medical
  {
    id: "knh-rehab",
    title: "Kenyatta National Hospital – Rehabilitation",
    titleSw: "Hospitali ya Kitaifa ya Kenyatta – Ukarabati",
    description:
      "Provides comprehensive rehabilitation services including physiotherapy, occupational therapy, speech therapy, and prosthetics for persons with disabilities.",
    descriptionSw:
      "Hutoa huduma kamili za ukarabati ikiwemo tiba ya mwili, tiba ya kazi, tiba ya usemi, na prosthetics kwa watu wenye ulemavu.",
    category: "health",
    tags: ["rehabilitation", "therapy", "physiotherapy", "Nairobi"],
    contact: "+254 20 2726300",
    website: "https://knh.or.ke",
    type: "organization",
  },
  {
    id: "mental-health",
    title: "Befrienders Kenya – Mental Health Helpline",
    titleSw: "Befrienders Kenya – Simu ya Msaada wa Afya ya Akili",
    description:
      "Free, confidential emotional support for people in distress, including those struggling with disability-related mental health challenges.",
    descriptionSw:
      "Msaada wa kihisia wa bure na wa siri kwa watu wanaopitia msongo wa mawazo, ikiwa ni pamoja na wale wanaokabiliwa na changamoto za afya ya akili.",
    category: "health",
    tags: ["mental health", "helpline", "free", "confidential"],
    contact: "+254 722 178 177",
    type: "hotline",
  },
  {
    id: "cbr",
    title: "Community Based Rehabilitation (CBR) Kenya",
    titleSw: "Ukarabati Unaotegemea Jamii (CBR) Kenya",
    description:
      "Community-based support programs that provide rehabilitation, social inclusion, and livelihood support for persons with disabilities at the grassroots level.",
    descriptionSw:
      "Programu za msaada wa jamii zinazotoa ukarabati, ujumuishaji wa kijamii, na msaada wa maisha kwa watu wenye ulemavu.",
    category: "health",
    tags: ["community", "rehabilitation", "livelihood", "grassroots"],
    type: "organization",
  },
  // Assistive Technology
  {
    id: "assistive-devices",
    title: "Assistive Devices Programme – NCPWD",
    titleSw: "Programu ya Vifaa Vya Kusaidia – NCPWD",
    description:
      "Government programme providing subsidized or free assistive devices including wheelchairs, crutches, hearing aids, and white canes to registered PWDs.",
    descriptionSw:
      "Programu ya serikali inayotoa vifaa vya kusaidia kwa bei nafuu au bure ikiwemo viti vya magurudumu, mikongojo, visaidizi vya kusikia, na fimbo nyeupe.",
    category: "assistive",
    tags: ["wheelchair", "hearing aid", "white cane", "free devices"],
    contact: "+254 20 2712557",
    website: "https://ncpwd.go.ke",
    type: "organization",
  },
  {
    id: "screen-readers",
    title: "Free Screen Readers & Accessibility Tools",
    titleSw: "Wasomaji wa Skrini na Zana za Upatikanaji Bila Malipo",
    description:
      "NVDA (Windows), VoiceOver (iOS/Mac), and TalkBack (Android) are free screen readers. Android phones also have built-in accessibility features for visual and motor impairments.",
    descriptionSw:
      "NVDA (Windows), VoiceOver (iOS/Mac), na TalkBack (Android) ni wasomaji wa skrini wa bure. Simu za Android pia zina vipengele vya upatikanaji kwa ulemavu wa kuona na mwendo.",
    category: "assistive",
    tags: ["screen reader", "NVDA", "VoiceOver", "TalkBack", "free"],
    website: "https://www.nvaccess.org",
    type: "guide",
  },
  // Education
  {
    id: "special-needs-education",
    title: "Kenya Institute of Special Education (KISE)",
    titleSw: "Taasisi ya Kenya ya Elimu Maalum (KISE)",
    description:
      "Kenya's national centre for special needs education providing training, research, and assessment services for children and adults with disabilities.",
    descriptionSw:
      "Kituo cha kitaifa cha Kenya cha elimu maalum kinachotoa mafunzo, utafiti, na huduma za tathmini kwa watoto na watu wazima wenye ulemavu.",
    category: "education",
    tags: ["special education", "KISE", "assessment", "training"],
    contact: "+254 20 3870701",
    website: "https://kise.ac.ke",
    type: "organization",
  },
  {
    id: "higher-education",
    title: "University Disability Support Units",
    titleSw: "Vitengo vya Msaada wa Ulemavu vya Chuo Kikuu",
    description:
      "Most Kenyan public universities have disability support units offering exam accommodations, accessible materials, and support services for students with disabilities.",
    descriptionSw:
      "Vyuo vikuu vingi vya umma vya Kenya vina vitengo vya msaada wa ulemavu vinavyotoa malazi ya mtihani, vifaa vinavyopatikana, na huduma za msaada.",
    category: "education",
    tags: ["university", "higher education", "accommodation", "students"],
    type: "guide",
  },
  // Employment
  {
    id: "employment-quota",
    title: "5% Employment Quota for PWDs",
    titleSw: "Kota ya 5% ya Ajira kwa Watu Wenye Ulemavu",
    description:
      "Kenya law requires that 5% of all government jobs be reserved for persons with disabilities. NCPWD assists with job placement and enforcement of this quota.",
    descriptionSw:
      "Sheria ya Kenya inahitaji kwamba 5% ya kazi zote za serikali zihifadhiwe kwa watu wenye ulemavu. NCPWD husaidia na uwekaji wa kazi na utekelezaji wa kota hii.",
    category: "employment",
    tags: ["employment", "quota", "government jobs", "placement"],
    contact: "+254 20 2712557",
    type: "legal",
  },
  {
    id: "vocational",
    title: "Kenya National Vocational Training Centres",
    titleSw: "Vituo vya Kitaifa vya Mafunzo ya Ufundi Kenya",
    description:
      "Vocational training centres across Kenya offer accessible skills training in tailoring, carpentry, ICT, and other trades for persons with disabilities.",
    descriptionSw:
      "Vituo vya mafunzo ya ufundi kote Kenya hutoa mafunzo ya ujuzi unaoweza kupatikana katika ushonaji, useremala, TEHAMA, na biashara nyingine.",
    category: "employment",
    tags: ["vocational", "skills", "ICT", "training"],
    type: "organization",
  },
  // Housing & Transport
  {
    id: "transport",
    title: "Accessible Transport Rights in Kenya",
    titleSw: "Haki za Usafiri Unaoweza Kupatikana Kenya",
    description:
      "The Persons with Disabilities Act requires that public transport be accessible. Matatu Owners Association guidelines mandate ramps and reserved seating for PWDs.",
    descriptionSw:
      "Sheria ya Watu Wenye Ulemavu inahitaji usafiri wa umma uwe na upatikanaji. Mwongozo wa Chama cha Wamiliki wa Matatu unaamrisha ramps na viti vilivyohifadhiwa.",
    category: "housing",
    tags: ["transport", "matatu", "accessibility", "rights"],
    type: "legal",
  },
  // Financial Support
  {
    id: "usd-fund",
    title: "Uwezo Disability Fund",
    titleSw: "Mfuko wa Ulemavu wa Uwezo",
    description:
      "Government-backed fund providing grants and low-interest loans to persons with disabilities for business startup, education, and livelihood improvement.",
    descriptionSw:
      "Mfuko unaosaidiwa na serikali unaotoa ruzuku na mikopo ya riba nafuu kwa watu wenye ulemavu kwa kuanzisha biashara, elimu, na kuboresha maisha.",
    category: "financial",
    tags: ["fund", "grants", "loans", "business", "government"],
    type: "organization",
  },
  {
    id: "tax-exemption",
    title: "Tax Exemptions for PWDs in Kenya",
    titleSw: "Msamaha wa Kodi kwa Watu Wenye Ulemavu Kenya",
    description:
      "Registered PWDs in Kenya are entitled to tax relief on income tax and exemption from import duty on assistive devices. Apply through KRA with your NCPWD card.",
    descriptionSw:
      "Watu wenye ulemavu waliosajiliwa Kenya wana haki ya kupunguzwa kodi ya mapato na msamaha wa ushuru wa uagizaji wa vifaa vya kusaidia.",
    category: "financial",
    tags: ["tax", "exemption", "KRA", "import duty", "NCPWD card"],
    type: "legal",
  },
  // Understanding Disabilities
  {
    id: "types-overview",
    title: "Types of Disabilities – Overview",
    titleSw: "Aina za Ulemavu – Muhtasari",
    description:
      "Disabilities include physical (mobility), sensory (vision/hearing), intellectual/cognitive, psychosocial (mental health), and multiple disabilities. Each has specific support needs and legal protections.",
    descriptionSw:
      "Ulemavu unajumuisha wa kimwili (mwendo), hisi (kuona/kusikia), kiakili/utambuzi, kisaikolojia (afya ya akili), na ulemavu mwingi. Kila aina ina mahitaji maalum ya msaada.",
    category: "types",
    tags: ["types", "physical", "visual", "hearing", "cognitive", "psychosocial"],
    type: "guide",
  },
  {
    id: "gda-info",
    title: "About Grassroots Disability Agenda (GDA)",
    titleSw: "Kuhusu Grassroots Disability Agenda (GDA)",
    description:
      "GDA is a Kenyan organization working to empower persons with disabilities through advocacy, community engagement, and accessible information. Abilispace is GDA's digital platform.",
    descriptionSw:
      "GDA ni shirika la Kenya linalofanya kazi kuimarisha watu wenye ulemavu kupitia utetezi, ushirikiano wa jamii, na taarifa zinazoweza kupatikana. Abilispace ni jukwaa la dijiti la GDA.",
    category: "types",
    tags: ["GDA", "advocacy", "Kenya", "community", "Abilispace"],
    website: "https://grassrootsdisability.org",
    type: "organization",
  },
]

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; labelKey: string }
> = {
  legal: { icon: Scale, color: "text-blue-600 dark:text-blue-400", labelKey: "resourcesLegalRights" },
  health: { icon: Heart, color: "text-red-600 dark:text-red-400", labelKey: "resourcesHealth" },
  assistive: { icon: Monitor, color: "text-purple-600 dark:text-purple-400", labelKey: "resourcesAssistiveTech" },
  education: { icon: GraduationCap, color: "text-green-600 dark:text-green-400", labelKey: "resourcesEducation" },
  employment: { icon: Briefcase, color: "text-orange-600 dark:text-orange-400", labelKey: "resourcesEmployment" },
  housing: { icon: Home, color: "text-teal-600 dark:text-teal-400", labelKey: "resourcesHousing" },
  financial: { icon: DollarSign, color: "text-yellow-600 dark:text-yellow-400", labelKey: "resourcesFinancial" },
  types: { icon: Brain, color: "text-indigo-600 dark:text-indigo-400", labelKey: "resourcesDisabilityTypes" },
}

const TYPE_BADGE: Record<Resource["type"], string> = {
  organization: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  guide: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  hotline: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  legal: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
}

export function Resources() {
  const { language, t } = useLanguage()
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")

  const filtered = RESOURCES.filter((r) => {
    const term = search.toLowerCase()
    const title = language === "sw" ? r.titleSw : r.title
    const desc = language === "sw" ? r.descriptionSw : r.description
    const matchesSearch =
      !term ||
      title.toLowerCase().includes(term) ||
      desc.toLowerCase().includes(term) ||
      r.tags.some((tag) => tag.toLowerCase().includes(term))
    const matchesCategory = activeCategory === "all" || r.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t("resourcesTitle")}</h2>
        <p className="text-muted-foreground mt-1">{t("resourcesSubtitle")}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          placeholder={t("searchResources")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label={t("searchResources")}
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <Button
          variant={activeCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveCategory("all")}
        >
          {t("allCategories")}
        </Button>
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <Button
              key={key}
              variant={activeCategory === key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(key)}
              className="gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t(cfg.labelKey as any)}
            </Button>
          )
        })}
      </div>

      {/* Resource cards */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No resources found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((resource) => {
            const cfg = CATEGORY_CONFIG[resource.category]
            const Icon = cfg.icon
            const title = language === "sw" ? resource.titleSw : resource.title
            const description = language === "sw" ? resource.descriptionSw : resource.description

            return (
              <Card key={resource.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base leading-snug">{title}</CardTitle>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[resource.type]}`}
                        >
                          {resource.type}
                        </span>
                        {resource.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 pt-0 gap-3">
                  <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
                  <div className="flex flex-wrap gap-2 mt-auto pt-2">
                    {resource.website && (
                      <Button asChild size="sm" variant="outline" className="gap-1.5 h-8">
                        <a
                          href={resource.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${t("visitWebsite")}: ${title}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("visitWebsite")}
                        </a>
                      </Button>
                    )}
                    {resource.contact && (
                      <Button asChild size="sm" variant="outline" className="gap-1.5 h-8">
                        <a href={`tel:${resource.contact.replace(/\s/g, "")}`} aria-label={`${t("callNow")}: ${resource.contact}`}>
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                          {resource.contact}
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
