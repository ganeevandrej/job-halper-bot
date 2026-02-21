export const createBody = (prompt: string) => ({
    model: process.env.MODEL_NAME,
    prompt,
    stream: false
})

