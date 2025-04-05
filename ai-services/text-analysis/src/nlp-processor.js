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
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeText = analyzeText;
// src/nlp-processor.ts
const factcheck_integration_1 = require("../src/factcheck-integration");
function analyzeText(content) {
    return __awaiter(this, void 0, void 0, function* () {
        const suspiciousKeywords = ['miracle', 'secret', 'shocking', 'cure'];
        const containsSuspicious = suspiciousKeywords.some((kw) => content.toLowerCase().includes(kw));
        let isFake = containsSuspicious;
        let confidence = containsSuspicious ? 0.7 : 0.3;
        let explanation = containsSuspicious
            ? 'Contains suspicious keywords commonly found in misinformation.'
            : 'No suspicious keywords found.';
        let sources = [];
        try {
            const factCheckResult = yield factcheck_integration_1.GoogleFactCheckTools.verifyClaim(content);
            if (factCheckResult.rating < 0.5) {
                isFake = true;
                confidence = Math.max(confidence, 1 - factCheckResult.rating);
                explanation += `\nFact-check rating suggests low credibility.`;
            }
            else {
                explanation += `\nFact-check rating supports credibility.`;
            }
            sources = factCheckResult.sources;
        }
        catch (error) {
            explanation += `\nCould not verify claim via Google Fact Check API.`;
        }
        return {
            isFake,
            confidence,
            explanation,
            sources
        };
    });
}
