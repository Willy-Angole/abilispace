"use strict";
/**
 * Routes Index
 *
 * Centralizes all route exports for cleaner imports.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = exports.healthRoutes = exports.articleRoutes = exports.eventRoutes = exports.messagingRoutes = exports.profileRoutes = exports.userRoutes = exports.authRoutes = void 0;
var auth_routes_1 = require("./auth.routes");
Object.defineProperty(exports, "authRoutes", { enumerable: true, get: function () { return __importDefault(auth_routes_1).default; } });
var user_routes_1 = require("./user.routes");
Object.defineProperty(exports, "userRoutes", { enumerable: true, get: function () { return __importDefault(user_routes_1).default; } });
var profile_routes_1 = require("./profile.routes");
Object.defineProperty(exports, "profileRoutes", { enumerable: true, get: function () { return __importDefault(profile_routes_1).default; } });
var messaging_routes_1 = require("./messaging.routes");
Object.defineProperty(exports, "messagingRoutes", { enumerable: true, get: function () { return __importDefault(messaging_routes_1).default; } });
var event_routes_1 = require("./event.routes");
Object.defineProperty(exports, "eventRoutes", { enumerable: true, get: function () { return __importDefault(event_routes_1).default; } });
var article_routes_1 = require("./article.routes");
Object.defineProperty(exports, "articleRoutes", { enumerable: true, get: function () { return __importDefault(article_routes_1).default; } });
var health_routes_1 = require("./health.routes");
Object.defineProperty(exports, "healthRoutes", { enumerable: true, get: function () { return __importDefault(health_routes_1).default; } });
var admin_routes_1 = require("./admin.routes");
Object.defineProperty(exports, "adminRoutes", { enumerable: true, get: function () { return __importDefault(admin_routes_1).default; } });
//# sourceMappingURL=index.js.map