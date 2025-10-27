const {addCreateDocumentOption} = require('../render-utils/add-create-document-option');
const {renderEmptyContainer} = require('../render-utils/render-empty-container');

function renderCivicActionNode(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    if (!node.actionId || node.actionId.trim() === '') {
        return renderEmptyContainer(document);
    }

    if (options.target === 'email') {
        return emailTemplate(node, document);
    } else {
        return frontendTemplate(node, document);
    }
}

function emailTemplate(node, document) {
    // For email, just show a link to the action
    const element = document.createElement('div');
    const html = `
        <div class="kg-card kg-civic-action-card" style="padding: 20px; border: 1px solid #e5eff5; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;">
            <div style="font-weight: 600; font-size: 16px; margin-bottom: 10px;">${node.title || 'Civic Action'}</div>
            ${node.description ? `<div style="color: #738a94; font-size: 14px; margin-bottom: 10px;">${node.description}</div>` : ''}
            ${node.takeActionUrl ? `<a href="${node.takeActionUrl}" style="display: inline-block; padding: 10px 20px; background: #15171A; color: #ffffff; text-decoration: none; border-radius: 4px;">Take Action</a>` : ''}
        </div>
    `;
    element.innerHTML = html;
    return {element};
}

function frontendTemplate(node, document) {
    // For frontend, render a placeholder that will be hydrated by JavaScript
    const element = document.createElement('figure');
    element.setAttribute('class', 'kg-card kg-civic-action-card');
    element.setAttribute('data-action-id', node.actionId || '');
    element.setAttribute('data-source', node.source || 'community');

    // Add all properties as data attributes for hydration
    if (node.title) element.setAttribute('data-title', node.title);
    if (node.description) element.setAttribute('data-description', node.description);
    if (node.eventType) element.setAttribute('data-event-type', node.eventType);
    if (node.eventDate) element.setAttribute('data-event-date', node.eventDate);
    if (node.location) element.setAttribute('data-location', node.location);
    if (node.imageUrl) element.setAttribute('data-image-url', node.imageUrl);
    if (node.takeActionUrl) element.setAttribute('data-take-action-url', node.takeActionUrl);

    // Loading placeholder - will be replaced by JavaScript
    const loadingDiv = document.createElement('div');
    loadingDiv.setAttribute('class', 'civic-action-loading');
    loadingDiv.textContent = 'Loading civic action...';
    element.appendChild(loadingDiv);

    return {element};
}

module.exports = renderCivicActionNode;
