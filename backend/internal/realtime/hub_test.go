package realtime

import (
	"testing"
	"time"
)

func TestHubPublishDeliversEventsToSubscribers(t *testing.T) {
	t.Parallel()

	hub := NewHub()
	events, unsubscribe := hub.Subscribe()
	defer unsubscribe()

	published := Event{Type: EventRoutesChanged, Timestamp: time.Now().UTC()}
	hub.Publish(published)

	select {
	case received := <-events:
		if received.Type != published.Type {
			t.Fatalf("expected event type %q, got %q", published.Type, received.Type)
		}
	case <-time.After(time.Second):
		t.Fatal("expected published event to be delivered")
	}
}

func TestHubUnsubscribeStopsDelivery(t *testing.T) {
	t.Parallel()

	hub := NewHub()
	events, unsubscribe := hub.Subscribe()
	unsubscribe()

	hub.Publish(Event{Type: EventUsersChanged, Timestamp: time.Now().UTC()})

	select {
	case _, ok := <-events:
		if ok {
			t.Fatal("did not expect an event after unsubscribe")
		}
	case <-time.After(100 * time.Millisecond):
	}
}
