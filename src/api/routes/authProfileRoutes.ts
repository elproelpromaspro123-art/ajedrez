import { Router } from "express";

export interface AuthProfileRouteDeps {
    enforceCsrfOrigin: (req: any, res: any) => boolean;
    getClientIdentifier: (req: any) => string;
    checkRegisterRateLimit: (clientId: string) => Promise<{ limited: boolean; retryAfterMs: number }>;
    checkLoginRateLimit: (clientId: string) => Promise<{ limited: boolean; retryAfterMs: number }>;
    parseAuthCredentials: (body: unknown) => { username: string; password: string } | null;
    USERNAME_MIN: number;
    USERNAME_MAX: number;
    PASSWORD_MIN: number;
    PASSWORD_MAX: number;
    readAuthState: () => Promise<{ scopedData: Record<string, unknown>; auth: any }>;
    pruneSessions: (auth: any) => void;
    usernameToKey: (username: string) => string;
    hashPassword: (password: string) => Promise<{ saltHex: string; hashHex: string }>;
    randomToken: () => string;
    buildSessionRecord: (req: any, userKey: string) => any;
    persistAuthState: (scopedData: Record<string, unknown>, auth: any) => Promise<any>;
    setAuthCookie: (req: any, res: any, token: string, expiresAtMs: number) => void;
    resolveDataBaseErrorMessage: (err: unknown, fallback: string) => string;
    verifyPassword: (password: string, saltHex: string, expectedHashHex: string) => Promise<boolean>;
    getAuthCookieToken: (req: any) => string | null;
    clearAuthCookie: (req: any, res: any) => void;
    resolveAuthContext: (req: any) => Promise<any | null>;
    isDataBaseError: (err: unknown) => boolean;
    unauthorized: (res: any, message?: string) => any;
    getDatabaseMeta: () => { namespace: string };
    asObject: (value: unknown) => Record<string, unknown> | null;
    normalizeProgressPatch: (value: unknown) => Record<string, unknown> | null;
    normalizeLessonsPatch: (value: unknown) => Record<string, unknown> | null;
    normalizeProfilePatch: (value: unknown) => Record<string, unknown> | null;
    isJsonPayloadSizeSafe: (value: unknown, maxBytes: number) => boolean;
    PROFILE_SYNC_MAX_BYTES: number;
    mergeObjectDeep: (base: unknown, patch: unknown, depth?: number) => unknown;
}

export function registerAuthProfileRoutes(router: Router, deps: AuthProfileRouteDeps) {
    const {
        enforceCsrfOrigin,
        getClientIdentifier,
        checkRegisterRateLimit,
        checkLoginRateLimit,
        parseAuthCredentials,
        USERNAME_MIN,
        USERNAME_MAX,
        PASSWORD_MIN,
        PASSWORD_MAX,
        readAuthState,
        pruneSessions,
        usernameToKey,
        hashPassword,
        randomToken,
        buildSessionRecord,
        persistAuthState,
        setAuthCookie,
        resolveDataBaseErrorMessage,
        verifyPassword,
        getAuthCookieToken,
        clearAuthCookie,
        resolveAuthContext,
        isDataBaseError,
        unauthorized,
        getDatabaseMeta,
        asObject,
        normalizeProgressPatch,
        normalizeLessonsPatch,
        normalizeProfilePatch,
        isJsonPayloadSizeSafe,
        PROFILE_SYNC_MAX_BYTES,
        mergeObjectDeep
    } = deps;

    router.post("/auth/register", async (req, res) => {
        if (!enforceCsrfOrigin(req, res)) {
            return;
        }
        const clientId = getClientIdentifier(req);
        const registerLimit = await checkRegisterRateLimit(clientId);
        if (registerLimit.limited) {
            res.setHeader("Retry-After", String(Math.ceil(registerLimit.retryAfterMs / 1000)));
            return res.status(429).json({
                message: "Demasiados intentos de registro. Espera un momento antes de reintentar.",
                retryAfterMs: registerLimit.retryAfterMs
            });
        }

        const credentials = parseAuthCredentials(req.body);
        if (!credentials) {
            return res.status(400).json({
                message: `Usuario/contrasena invalidos. Usuario: ${USERNAME_MIN}-${USERNAME_MAX} caracteres [A-Za-z0-9_], contrasena: ${PASSWORD_MIN}-${PASSWORD_MAX} caracteres.`
            });
        }

        try {
            const { scopedData, auth } = await readAuthState();
            pruneSessions(auth);

            const userKey = usernameToKey(credentials.username);
            if (auth.users[userKey]) {
                return res.status(409).json({ message: "Ese usuario ya existe." });
            }

            const nowIso = new Date().toISOString();
            const hashed = await hashPassword(credentials.password);
            auth.users[userKey] = {
                username: credentials.username,
                passwordSalt: hashed.saltHex,
                passwordHash: hashed.hashHex,
                createdAt: nowIso,
                updatedAt: nowIso,
                store: {}
            };

            const token = randomToken();
            const session = buildSessionRecord(req, userKey);
            auth.sessions[token] = session;
            pruneSessions(auth);

            await persistAuthState(scopedData, auth);
            setAuthCookie(req, res, token, Date.parse(session.expiresAt));

            return res.status(201).json({
                ok: true,
                authenticated: true,
                user: {
                    username: auth.users[userKey].username
                },
                warning: "No hay recuperacion de contrasena. Guardala en un lugar seguro."
            });
        } catch (err) {
            console.error("Auth register failed:", err);
            return res.status(500).json({
                message: resolveDataBaseErrorMessage(err, "No se pudo crear la cuenta.")
            });
        }
    });

    router.post("/auth/login", async (req, res) => {
        if (!enforceCsrfOrigin(req, res)) {
            return;
        }
        const clientId = getClientIdentifier(req);
        const loginLimit = await checkLoginRateLimit(clientId);
        if (loginLimit.limited) {
            res.setHeader("Retry-After", String(Math.ceil(loginLimit.retryAfterMs / 1000)));
            return res.status(429).json({
                message: "Demasiados intentos de login. Espera un momento antes de reintentar.",
                retryAfterMs: loginLimit.retryAfterMs
            });
        }

        const credentials = parseAuthCredentials(req.body);
        if (!credentials) {
            return res.status(400).json({ message: "Credenciales invalidas." });
        }

        try {
            const { scopedData, auth } = await readAuthState();
            pruneSessions(auth);

            const userKey = usernameToKey(credentials.username);
            const user = auth.users[userKey];
            if (!user || !(await verifyPassword(credentials.password, user.passwordSalt, user.passwordHash))) {
                return res.status(401).json({ message: "Usuario o contrasena incorrectos." });
            }

            const token = randomToken();
            const session = buildSessionRecord(req, userKey);
            auth.sessions[token] = session;
            pruneSessions(auth);
            await persistAuthState(scopedData, auth);
            setAuthCookie(req, res, token, Date.parse(session.expiresAt));

            return res.json({
                ok: true,
                authenticated: true,
                user: {
                    username: user.username
                }
            });
        } catch (err) {
            console.error("Auth login failed:", err);
            return res.status(500).json({
                message: resolveDataBaseErrorMessage(err, "No se pudo iniciar sesion.")
            });
        }
    });

    router.post("/auth/logout", async (req, res) => {
        if (!enforceCsrfOrigin(req, res)) {
            return;
        }
        const token = getAuthCookieToken(req);

        try {
            if (token) {
                const { scopedData, auth } = await readAuthState();
                if (auth.sessions[token]) {
                    delete auth.sessions[token];
                    pruneSessions(auth);
                    await persistAuthState(scopedData, auth);
                }
            }
        } catch (err) {
            console.error("Auth logout failed:", err);
        }

        clearAuthCookie(req, res);
        return res.json({
            ok: true,
            authenticated: false
        });
    });

    router.get("/auth/session", async (req, res) => {
        try {
            const ctx = await resolveAuthContext(req);
            if (!ctx) {
                return res.json({
                    authenticated: false
                });
            }

            return res.json({
                authenticated: true,
                user: {
                    username: ctx.user.username
                }
            });
        } catch (err) {
            console.error("Auth session check failed:", err);
            if (isDataBaseError(err)) {
                clearAuthCookie(req, res);
                return res.json({
                    authenticated: false,
                    message: resolveDataBaseErrorMessage(err, "No se pudo validar la sesion.")
                });
            }
            return res.status(500).json({
                authenticated: false,
                message: resolveDataBaseErrorMessage(err, "No se pudo validar la sesion.")
            });
        }
    });

    router.get("/profile-store", async (req, res) => {
        try {
            const ctx = await resolveAuthContext(req);
            if (!ctx) {
                clearAuthCookie(req, res);
                return unauthorized(res);
            }

            return res.json({
                namespace: getDatabaseMeta().namespace,
                user: {
                    username: ctx.user.username
                },
                data: asObject(ctx.user.store) || {}
            });
        } catch (err) {
            console.error("Profile store read failed:", err);
            return res.status(500).json({
                message: "No se pudo leer el perfil en base de datos."
            });
        }
    });

    router.post("/profile-store/sync", async (req, res) => {
        if (!enforceCsrfOrigin(req, res)) {
            return;
        }
        const payload = req.body || {};
        const patch: Record<string, unknown> = {};

        const progress = normalizeProgressPatch((payload as any).progress);
        const lessons = normalizeLessonsPatch((payload as any).lessons);
        const profile = normalizeProfilePatch((payload as any).profile);

        if (progress) {
            patch.progress = progress;
        }
        if (lessons) {
            patch.lessons = lessons;
        }
        if (profile) {
            patch.profile = profile;
        }

        try {
            const ctx = await resolveAuthContext(req);
            if (!ctx) {
                clearAuthCookie(req, res);
                return unauthorized(res);
            }

            if (Object.keys(patch).length === 0) {
                return res.status(400).json({
                    message: "El payload está vacío o no es válido para sincronizar."
                });
            }
            if (!isJsonPayloadSizeSafe(patch, PROFILE_SYNC_MAX_BYTES)) {
                return res.status(413).json({ message: "El payload de sincronizacion es demasiado grande." });
            }

            const currentStore = asObject(ctx.user.store) || {};
            const mergedStore = mergeObjectDeep(currentStore, patch);
            const updatedUser = {
                ...ctx.user,
                updatedAt: new Date().toISOString(),
                store: asObject(mergedStore) || {}
            };
            ctx.auth.users[ctx.userKey] = updatedUser;
            pruneSessions(ctx.auth);
            await persistAuthState(ctx.scopedData, ctx.auth);

            return res.json({
                ok: true,
                namespace: getDatabaseMeta().namespace,
                user: {
                    username: updatedUser.username
                },
                data: updatedUser.store
            });
        } catch (err) {
            console.error("Profile store sync failed:", err);
            return res.status(500).json({
                message: "No se pudo sincronizar el perfil en base de datos."
            });
        }
    });
}
