"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const nlp_processor_1 = require("./nlp-processor"); // Make sure this exists
const factcheck_integration_1 = require("./factcheck-integration");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.post('/analyze-text', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { content } = req.body;
        // 1. NLP Analysis
        const nlpResult = yield (0, nlp_processor_1.analyzeText)(content); // Make sure analyzeText returns an object with `.confidence` etc.
        // 2. Google Fact Check API
        const factCheckResult = yield factcheck_integration_1.GoogleFactCheckTools.verifyClaim(content);
        // 3. Combine both scores
        const finalScore = (nlpResult.confidence + factCheckResult.rating) / 2;
        // 4. Return the result
        res.json({
            isFake: finalScore < 0.5,
            confidence: finalScore,
            explanation: `NLP: ${nlpResult.explanation}, Fact Check Rating: ${factCheckResult.rating}`,
            sources: [...(nlpResult.sources || []), ...factCheckResult.sources]
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
app.listen(8000, () => {
    console.log('AI Text Service running on port 8000');
});
