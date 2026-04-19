FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS builder

WORKDIR /src

RUN apk add --no-cache ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG TARGETOS
ARG TARGETARCH

RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -o /out/routegate-router ./cmd/routegate-router

FROM alpine:3.21 AS runtime

RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S app && \
    adduser -S app -G app

WORKDIR /app

COPY --from=builder /out/routegate-router /usr/local/bin/routegate-router

EXPOSE 3068

USER app

ENTRYPOINT ["/usr/local/bin/routegate-router"]
