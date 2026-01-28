# ----------------------------------------
# Stage 1: Base & Dependencies
# ----------------------------------------
FROM node:20-alpine AS base

# Install PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package configs
COPY package.json pnpm-lock.yaml ./

# ----------------------------------------
# Stage 2: Development Dependencies (for building)
# ----------------------------------------
FROM base AS deps
# Install all dependencies (including devDependencies like typescript)
RUN pnpm install

# ----------------------------------------
# Stage 3: Build
# ----------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compile TypeScript to JavaScript (dist folder)
RUN pnpm build 

# ----------------------------------------
# Stage 4: Production Dependencies
# ----------------------------------------
FROM base AS production-deps
# Install ONLY production dependencies to keep image light
RUN pnpm install --prod --frozen-lockfile

# ----------------------------------------
# Stage 5: Runner (Final Image)
# ----------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Create a non-root user for security (Best Practice for AWS/Render)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy necessary files from build stages
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Switch to non-root user
USER expressjs

# Expose port
EXPOSE 8080

# Start command
CMD ["node", "dist/server.js"]