FROM node:18-alpine

WORKDIR /usr/src/app

# Pre-copy manifests so npm install can leverage caching
COPY package.json package-lock.json ./
COPY packages/relayer/package.json packages/relayer/package.json
COPY packages/relayer/package-lock.json packages/relayer/package-lock.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/contracts/package-lock.json packages/contracts/package-lock.json

# Install root tooling (eslint/prettier) and workspace dependencies
RUN HUSKY=0 npm install --ignore-scripts --workspaces=false
RUN HUSKY=0 npm install --ignore-scripts --prefix packages/relayer
RUN HUSKY=0 npm install --ignore-scripts --prefix packages/contracts

# Copy repository source (contracts artifacts, relayer src, docs)
COPY . .

WORKDIR /usr/src/app/packages/relayer

CMD ["npm", "run", "start"]
