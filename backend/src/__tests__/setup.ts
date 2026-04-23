// Env vars minimi per i test (sovrascrivono .env)
process.env.JWT_SECRET = "test_secret";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.RESEND_API_KEY = "re_placeholder";
process.env.GROQ_API_KEY = "test_key";
