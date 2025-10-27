(function() {
    'use strict';

    // Configuration - bridge URL from Ghost config or default
    const BRIDGE_URL = window.ghostCivicBridgeUrl || 'https://your-bridge-url.com';

    // Hydrate all civic action cards on the page
    function hydrateCivicActionCards() {
        const cards = document.querySelectorAll('.kg-civic-action-card[data-action-id]');

        cards.forEach(card => {
            const actionId = card.getAttribute('data-action-id');
            const source = card.getAttribute('data-source') || 'community';

            // If we already have all the data in attributes, render immediately
            const title = card.getAttribute('data-title');
            const description = card.getAttribute('data-description');
            const eventType = card.getAttribute('data-event-type');
            const eventDate = card.getAttribute('data-event-date');
            const location = card.getAttribute('data-location');
            const imageUrl = card.getAttribute('data-image-url');
            const takeActionUrl = card.getAttribute('data-take-action-url');

            if (title && description) {
                renderCivicAction(card, {
                    actionId,
                    source,
                    title,
                    description,
                    eventType,
                    eventDate,
                    location,
                    imageUrl,
                    takeActionUrl
                });
            } else {
                // Fetch from bridge API
                fetchCivicAction(actionId, source)
                    .then(data => renderCivicAction(card, data))
                    .catch(error => renderError(card, error));
            }
        });
    }

    // Fetch civic action data from bridge API
    async function fetchCivicAction(actionId, source) {
        const url = `${BRIDGE_URL}/api/civic-actions/${source}/${actionId}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to load civic action');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching civic action:', error);
            throw error;
        }
    }

    // Render civic action card
    function renderCivicAction(card, data) {
        card.innerHTML = '';
        card.classList.add('kg-civic-action-card-rendered');

        // Create card structure
        const container = document.createElement('div');
        container.className = 'civic-action-container';

        // Image
        if (data.imageUrl) {
            const img = document.createElement('img');
            img.src = data.imageUrl;
            img.alt = data.title || 'Civic Action';
            img.className = 'civic-action-image';
            container.appendChild(img);
        }

        // Content
        const content = document.createElement('div');
        content.className = 'civic-action-content';

        // Event type badge
        if (data.eventType) {
            const badge = document.createElement('span');
            badge.className = `civic-action-badge civic-action-badge-${data.eventType}`;
            badge.textContent = data.eventType;
            content.appendChild(badge);
        }

        // Title
        const title = document.createElement('h3');
        title.className = 'civic-action-title';
        title.textContent = data.title || 'Civic Action';
        content.appendChild(title);

        // Description
        if (data.description) {
            const desc = document.createElement('p');
            desc.className = 'civic-action-description';
            desc.textContent = data.description;
            content.appendChild(desc);
        }

        // Event details
        if (data.eventDate || data.location) {
            const details = document.createElement('div');
            details.className = 'civic-action-details';

            if (data.eventDate) {
                const date = document.createElement('div');
                date.className = 'civic-action-date';
                date.textContent = formatDate(data.eventDate);
                details.appendChild(date);
            }

            if (data.location) {
                const loc = document.createElement('div');
                loc.className = 'civic-action-location';
                loc.textContent = data.location;
                details.appendChild(loc);
            }

            content.appendChild(details);
        }

        // Action button
        if (data.takeActionUrl) {
            const button = document.createElement('a');
            button.href = data.takeActionUrl;
            button.className = 'civic-action-button';
            button.textContent = 'Take Action';
            button.target = '_blank';
            button.rel = 'noopener noreferrer';

            // Track click
            button.addEventListener('click', () => {
                trackClick(data.actionId, data.source);
            });

            content.appendChild(button);
        }

        container.appendChild(content);
        card.appendChild(container);
    }

    // Render error state
    function renderError(card, error) {
        card.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'civic-action-error';
        errorDiv.textContent = 'Unable to load civic action';
        card.appendChild(errorDiv);
    }

    // Format date
    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }

    // Track click for analytics
    function trackClick(actionId, source) {
        fetch(`${BRIDGE_URL}/api/civic-actions/${source}/${actionId}/click`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        }).catch(() => {
            // Silently fail - analytics shouldn't break the UX
        });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hydrateCivicActionCards);
    } else {
        hydrateCivicActionCards();
    }
})();
