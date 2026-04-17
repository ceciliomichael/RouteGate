package server

import (
	"net/http"
	"strings"

	"routegate/internal/proxy"
)

type Dispatcher struct {
	api   http.Handler
	proxy *proxy.Handler
}

func NewDispatcher(api http.Handler, proxyHandler *proxy.Handler) *Dispatcher {
	return &Dispatcher{
		api:   api,
		proxy: proxyHandler,
	}
}

func (d *Dispatcher) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	handled, err := d.proxy.TryServe(writer, request)
	if handled || err != nil {
		return
	}

	if strings.HasPrefix(request.URL.Path, "/api/") {
		d.api.ServeHTTP(writer, request)
		return
	}

	http.NotFound(writer, request)
}
