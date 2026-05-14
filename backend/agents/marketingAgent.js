import OpenAI from "openai";

export async function marketingAgent(
  payload
) {

  try {

    const openai =
    new OpenAI({

      apiKey:
        process.env.OPENAI_API_KEY
    });

    const prompt = `

      You are CraftNova's AI Marketing Strategist.

      Analyze the following business request
      and generate a professional marketing strategy.

      BUSINESS REQUEST:
      ${JSON.stringify(payload)}

      Include:

      1. Marketing Strategy
      2. Target Audience
      3. Social Media Recommendations
      4. Lead Generation Ideas
      5. Growth Recommendations

    `;

    const response =
    await openai.chat.completions.create({

      model: "gpt-4o-mini",

      messages: [

        {
          role: "system",

          content:
            "You are an elite AI marketing strategist."
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