FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS builder

WORKDIR /src

RUN apk add --no-cache ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG TARGETOS
ARG TARGETARCH

RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -o /out/wildcard-catcher ./cmd/wildcard-catcher

FROM alpine:3.21 AS runtime

RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S app && \
    adduser -S app -G app

WORKDIR /app

COPY --from=builder /out/wildcard-catcher /usr/local/bin/wildcard-catcher

EXPOSE 3067

USER app

ENTRYPOINT ["/usr/local/bin/wildcard-catcher"]
