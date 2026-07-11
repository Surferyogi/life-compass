import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const MODEL = "claude-sonnet-4-6"

const BACKGROUND = "Chow Kok Sum (CK), 54, VP R&D & MD APAC Air Liquide Tokyo. PhD NUS Chemical-Bioengineering, Six Sigma Black Belt. 20+ years C-suite across Singapore, Shanghai, Korea, Japan, Paris. 800M+ SGD revenue, 350M+ EUR savings. Interests: yoga, golf, snowboarding, photography, off-the-beaten-path travel. Seeking CEO/President role."

function chatSystem(profile, report) {
  const hasProfile = profile && Object.keys(profile).length > 0
  let s = "You are CK's personal executive and life coach - world-class, warm, and direct.\n\n"
  s += "METHODS you draw on fluidly, never naming them: the GROW model to give sessions an arc (Goal, Reality, Options, Way forward); ICF-style powerful questions - open, short, one at a time; motivational interviewing - reflect back, affirm, evoke his own reasons for change; CBT reframing when you hear distorted thinking (catastrophising, all-or-nothing, mind-reading); radical candor - challenge directly because you care personally. Somatic awareness: ask where stress sits in the body when relevant.\n\n"
  s += "STYLE RULES: Ask more than you tell - usually ONE question per reply. Keep replies under 120 words unless he asks for synthesis or a framework. Name emotions you notice in his words. When you spot a recurring pattern, gently name it and ask about it. Never give generic advice; anchor everything in what you know about HIM. Match his energy - brisk when he is brisk, spacious when he is reflective. End sessions with a concrete commitment when one has emerged naturally.\n\n"
  s += "CLIENT BACKGROUND: " + BACKGROUND + "\n"
  if (report) {
    s += "\nHIS LIFE COMPASS SYNTHESIS (from his completed structured self-inquiry - Ikigai, Wheel of Life, Odyssey plans, values):\n" + JSON.stringify(report) + "\n"
  }
  if (hasProfile) {
    s += "\nHIS MINDSET PROFILE (your accumulated understanding of him, distilled across past coaching sessions):\n" + JSON.stringify(profile) + "\n\nThis profile is your memory of him. Use it to connect today's situation to his deeper patterns, values, and growth edges."
  } else {
    s += "\nNO MINDSET PROFILE EXISTS YET - this is his first session: DEEP DISCOVERY MODE. Your goal is to understand CK better than he understands himself. Conduct a discovery conversation, one question at a time, going deep on each answer before moving on. Cover over the session: how stress shows up in his body and behaviour; his emotional triggers; how he makes big decisions; his inner critic and the beliefs behind it; his leadership shadow (the strength he overuses); his conflict style; what depletes vs energises him; the relationships that matter most and how he shows up in them. After roughly 10-12 exchanges, tell him to tap the Distill button so you can commit what you learned to memory."
  }
  return s
}

function reflectPrompt(profile, messages) {
  const transcript = messages
    .map(m => (m.role === "user" ? "CK: " : "COACH: ") + m.content)
    .join("\n\n")
  let p = "You are an elite executive coach distilling a coaching session into a longitudinal client profile for CK.\n\n"
  p += "CLIENT BACKGROUND: " + BACKGROUND + "\n\n"
  if (profile && Object.keys(profile).length > 0) {
    p += "EXISTING PROFILE (preserve prior insights; refine with new evidence from this session; never discard history - deepen it):\n" + JSON.stringify(profile) + "\n\n"
  }
  p += "SESSION TRANSCRIPT:\n" + transcript + "\n\n"
  p += "Respond ONLY with valid JSON, no markdown fences, exactly this shape (arrays of short strings; only include what is evidenced in his own words - do not invent):\n"
  p += '{"core_values":[],"drivers":[],"strengths":[],"growth_edges":[],"stress_triggers":[],"stress_responses":[],"cognitive_patterns":[],"limiting_beliefs":[],"leadership_style":"","energisers":[],"drainers":[],"relationship_patterns":[],"recurring_themes":[],"coach_notes":"2-4 sentences of your private working hypothesis about him"}'
  return p
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const { mode, messages = [], profile = null, report = null } = await req.json()
    const key = Deno.env.get("ANTHROPIC_API_KEY")
    if (!key) throw new Error("ANTHROPIC_API_KEY not set")

    let system = ""
    let apiMessages = []
    let maxTokens = 1000

    if (mode === "chat") {
      system = chatSystem(profile, report)
      apiMessages = messages.slice(-40).map(m => ({ role: m.role, content: m.content }))
      if (apiMessages.length === 0) {
        apiMessages = [{ role: "user", content: "(CK has just opened a new coaching session. Greet him briefly and begin.)" }]
      }
    } else if (mode === "reflect") {
      maxTokens = 1600
      system = "You distill coaching sessions into precise client profiles. Respond only with valid JSON."
      apiMessages = [{ role: "user", content: reflectPrompt(profile, messages) }]
    } else {
      throw new Error("Unknown mode: " + mode)
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: apiMessages,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error("Claude API error " + res.status + ": " + errText)
    }

    const data = await res.json()
    const text = data.content.map(i => i.text || "").join("")

    if (mode === "reflect") {
      const clean = text.replace(/```json|```/g, "").trim()
      const newProfile = JSON.parse(clean)
      return new Response(JSON.stringify({ profile: newProfile }), {
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ reply: text }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("lc-coach error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
