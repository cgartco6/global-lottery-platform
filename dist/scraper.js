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
exports.ScraperService = void 0;
const chispazo_1 = require("./scrapers/chispazo");
const japan_mini_1 = require("./scrapers/japan_mini");
const lottoland_1 = require("./scrapers/lottoland");

class ScraperService {
    constructor() {
        this.chispazo = new chispazo_1.ChispazoScraper();
        this.japan = new japan_mini_1.JapanMiniLottoScraper();
        this.lottoland = new lottoland_1.LottolandScraper();
    }
    fetchChispazoResults() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.chispazo.fetchLatest();
        });
    }
    fetchJapanMiniLottoResults() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.japan.fetchLatest();
        });
    }
    fetchLottolandLotteries() {
        return __awaiter(this, void 0, void 0, function* () {
            const euro = yield this.lottoland.fetchEuroMillions();
            const pb = yield this.lottoland.fetchPowerball();
            return [...euro, ...pb];
        });
    }
}
exports.ScraperService = ScraperService;
