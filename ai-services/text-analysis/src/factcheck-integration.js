"use strict";
// src/utils/factcheck-integration.ts
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
exports.GoogleFactCheckTools = void 0;
const googleapis_1 = require("googleapis");
const google_auth_library_1 = require("google-auth-library");
class GoogleFactCheckTools {
    static verifyClaim(query) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const auth = new google_auth_library_1.GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/factchecktools']
            });
            const authClient = (yield auth.getClient());
            const factchecktools = googleapis_1.google.factchecktools({
                version: 'v1alpha1',
                auth: authClient
            });
            const res = yield factchecktools.claims.search({
                query,
                languageCode: 'en-US'
            });
            const claims = res.data.claims || [];
            const firstClaim = claims[0];
            const textualRating = (_b = (_a = firstClaim === null || firstClaim === void 0 ? void 0 : firstClaim.claimReview) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.textualRating;
            return {
                rating: textualRating
                    ? GoogleFactCheckTools.convertRatingToScore(textualRating)
                    : 0.5,
                sources: ((_c = firstClaim === null || firstClaim === void 0 ? void 0 : firstClaim.claimReview) === null || _c === void 0 ? void 0 : _c.map((r) => { var _a, _b; return ((_a = r.publisher) === null || _a === void 0 ? void 0 : _a.site) || ((_b = r.publisher) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown'; })) || []
            };
        });
    }
    static convertRatingToScore(rating) {
        var _a;
        const map = {
            'True': 1.0,
            'Mostly True': 0.8,
            'Half True': 0.5,
            'Mostly False': 0.3,
            'False': 0.0
        };
        return (_a = map[rating]) !== null && _a !== void 0 ? _a : 0.5;
    }
}
exports.GoogleFactCheckTools = GoogleFactCheckTools;
