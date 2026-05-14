import OpenAI from "openai";

export async function emailAgent(
  payload
) {

  try {

    const openai =
    new OpenAI({

      apiKey:
        process.env.OPENAI_API_KEY
    });

    const prompt = `

      You are CraftNova's AI Email Specialist.

      Generate a professional business email
      using the information below.

      DETAILS:
      ${JSON.stringify(payload)}

    `;

    const response =
    await openai.chat.completions.create({

      model: "gpt-4o-mini",

      messages: [

        {
          role: "system",

          content:
            "You are an elite AI email writer."
        },

        {
          role: "user",

          content: prompt
        }
      ],

      temperature: 0.6
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