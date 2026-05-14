import OpenAI from "openai";

export async function salesAgent(
  payload
) {

  try {

    const openai =
    new OpenAI({

      apiKey:
        process.env.OPENAI_API_KEY
    });

    const prompt = `

      You are CraftNova's AI Sales Strategist.

      Analyze this business information
      and generate a sales strategy.

      BUSINESS:
      ${JSON.stringify(payload)}

      Include:

      1. Sales Funnel Strategy
      2. Lead Conversion Strategy
      3. Sales Outreach Ideas
      4. Customer Retention Plan
      5. Revenue Growth Suggestions

    `;

    const response =
    await openai.chat.completions.create({

      model: "gpt-4o-mini",

      messages: [

        {
          role: "system",

          content:
            "You are an elite AI sales strategist."
        },

        {
          role: "user",

          content: prompt
        }
      ],

      temperature: 0.7
    });

    return {

      success: true,

      output:
        response.choices[0]
        .message.content
    };

  } catch (error) {

    console.error(error);

    return {

      success: false,

      error:
        error.message
    };
  }
}