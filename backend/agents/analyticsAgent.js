import OpenAI from "openai";

export async function analyticsAgent(
  payload
) {

  try {

    const openai =
    new OpenAI({

      apiKey:
        process.env.OPENAI_API_KEY
    });

    const prompt = `

      You are CraftNova's AI Data Analyst.

      Analyze the business data below
      and generate operational insights.

      BUSINESS DATA:
      ${JSON.stringify(payload)}

      Include:

      1. Business Insights
      2. Performance Indicators
      3. Risk Analysis
      4. Optimization Opportunities
      5. Strategic Recommendations

    `;

    const response =
    await openai.chat.completions.create({

      model: "gpt-4o-mini",

      messages: [

        {
          role: "system",

          content:
            "You are an elite AI business analyst."
        },

        {
          role: "user",

          content: prompt
        }
      ],

      temperature: 0.5
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