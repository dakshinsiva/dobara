// Builds the Bolna create/update agent payload for Dobara.
// Stack: Plivo telephony (buildathon partner) via Bolna, Sarvam STT (saaras:v4) and TTS (bulbul),
// OpenAI gpt-4.1-mini (on Bolna's flat-rate list), multilingual en/hi/kn/ta with auto switching.

import { AGENT_NAME, SYSTEM_PROMPT, WELCOME_MESSAGE } from "./prompts.mjs";

export const LANGUAGES = { en: "English", hi: "Hindi", kn: "Kannada", ta: "Tamil" };

// bulbul:v3 voices work across languages; v4-flash voices are per language and need exact ids.
const SARVAM_VOICE = { voice: "Suhani", voice_id: "suhani", model: "bulbul:v3" };

function sarvamSynthesizer(language) {
  return {
    provider: "sarvam",
    provider_config: { ...SARVAM_VOICE, language, speed: 1.0 },
    stream: true,
    buffer_size: 150,
  };
}

function sarvamTranscriber(language, keywords) {
  return {
    provider: "sarvam",
    model: "saaras:v4",
    language,
    stream: true,
    endpointing: 500,
    keywords,
    context:
      "Outbound check-in call from an Indian nutrition brand to an existing customer about a protein powder they bought. Customers mention flavours, scoops, bloating, milk, water, workouts, reorder and WhatsApp.",
  };
}

/**
 * @param {object} opts
 * @param {string} opts.webhookUrl  Public URL Bolna posts execution updates to
 * @param {string} [opts.keywords]  Comma-separated terms to bias transcription (brand, products, flavours)
 * @param {number} [opts.callStartHour]  Earliest hour to dial, recipient time (0-23)
 * @param {number} [opts.callEndHour]    Latest hour to dial, recipient time (0-23)
 */
export function buildAgentConfig({
  webhookUrl,
  keywords = "Cosmix, Dobara, protein, pea protein, whey, mocha, cacao, strawberry, scoop, WhatsApp",
  callStartHour = 10,
  callEndHour = 19,
}) {
  const languages = Object.fromEntries(
    Object.keys(LANGUAGES).map((code) => [
      code,
      {
        transcriber: sarvamTranscriber(code, keywords),
        synthesizer: sarvamSynthesizer(code),
        agent_name: AGENT_NAME,
      },
    ])
  );

  return {
    agent_config: {
      agent_name: AGENT_NAME,
      agent_welcome_message: WELCOME_MESSAGE,
      webhook_url: webhookUrl,
      call_summary_enabled: true,
      calling_guardrails: { call_start_hour: callStartHour, call_end_hour: callEndHour },
      tasks: [
        {
          task_type: "conversation",
          toolchain: {
            execution: "sequential",
            pipelines: [["transcriber", "llm", "synthesizer"]],
          },
          tools_config: {
            llm_agent: {
              agent_type: "simple_llm_agent",
              agent_flow_type: "streaming",
              llm_config: {
                provider: "openai",
                model: "gpt-4.1-mini",
                max_tokens: 300,
                temperature: 0.3,
              },
            },
            transcriber: sarvamTranscriber("en", keywords),
            synthesizer: sarvamSynthesizer("en"),
            // Plivo carries the call. Bolna's shared +91 numbers are Plivo-hosted;
            // a number you buy or link in Bolna is also Plivo.
            input: { provider: "plivo", format: "wav" },
            output: { provider: "plivo", format: "wav" },
            multilingual_config: {
              enabled: true,
              active_language: "en",
              languages,
            },
          },
          task_config: {
            call_terminate: 300,
            hangup_after_silence: 12,
            incremental_delay: 400,
            number_of_words_for_interruption: 2,
            check_if_user_online: true,
            trigger_user_online_message_after: 10,
            voicemail: false,
            dtmf_enabled: false,
          },
        },
      ],
    },
    agent_prompts: {
      task_1: { system_prompt: SYSTEM_PROMPT },
    },
  };
}
