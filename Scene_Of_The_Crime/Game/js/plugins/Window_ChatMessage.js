//=============================================================================
// Window_ChatMessage.js
// Displays chat messages in a scrollable list
//=============================================================================

function Window_ChatMessage(rect) {
    this.initialize.apply(this, arguments);
}

Window_ChatMessage.prototype = Object.create(Window_Selectable.prototype);
Window_ChatMessage.prototype.constructor = Window_ChatMessage;

Window_ChatMessage.prototype.initialize = function(rect) {
    Window_Selectable.prototype.initialize.call(this, rect);
    this._messages = [];
    this._sceneChat = null;
    this._messageReplies = {};
    this._expandedMessages = new Set();
    this.select(0);
    // Window_Selectable.initialize always ends with deactivate(), so we must
    // explicitly re-activate here for clicks and wheel scroll to work.
    this.activate();
};

Window_ChatMessage.prototype.setSceneChat = function(sceneChat) {
    this._sceneChat = sceneChat;
};

Window_ChatMessage.prototype.setMessages = function(messages) {
    const isFirstLoad   = this._messages.length === 0;
    const prevScrollY   = this.scrollY();
    const maxPrev       = Math.max(0, this.overallHeight() - this.innerHeight);
    const wasAtBottom   = prevScrollY >= maxPrev - 5;

    this._messages = messages;
    this._messageReplies = {};
    this._expandedMessages.clear();
    this.refresh(); // createContents() inside refresh resets scroll to 0

    if (isFirstLoad || wasAtBottom) {
        // Auto-follow new messages when already at the bottom
        this.scrollTo(0, this.overallHeight());
    } else {
        // User is reading old messages — keep their position
        this.scrollTo(0, prevScrollY);
    }
};

Window_ChatMessage.prototype.maxItems = function() {
    return this._messages.length;
};

Window_ChatMessage.prototype.itemHeight = function() {
    return this.lineHeight() * 3;
};

Window_ChatMessage.prototype.drawItem = function(index) {
    const message = this._messages[index];
    if (!message) return;

    const rect = this.itemLineRect(index);
    const lineHeight = this.lineHeight();

    // Draw message box background
    this.contents.fillRect(rect.x, rect.y, rect.width - 4, rect.height - 2, 
                          this.getMessageColor(message));

    // Draw username
    this.contents.fontSize = 18;
    this.changeTextColor(ColorManager.textColor(7)); // Light color for username
    this.drawText(message.username, rect.x + 12, rect.y + 4, 200);

    // Draw timestamp — stop 40px from the right edge to leave room for ⋮
    this.contents.fontSize = 14;
    this.changeTextColor(ColorManager.textColor(7));
    const timeStr = this.formatTime(message.created_at);
    this.drawText(timeStr, rect.x + rect.width - 160, rect.y + 4, 120, 'right');

    // ⋮ button — drawn using RPG Maker's standard outer-border + inner-fill pattern
    const btnW = 30;
    const btnH = 26;
    const btnX = rect.x + rect.width - btnW - 6;
    const btnY = rect.y + 4;
    this.contents.fillRect(btnX, btnY, btnW, btnH, 'rgba(255,255,255,0.45)');
    this.contents.fillRect(btnX + 1, btnY + 1, btnW - 2, btnH - 2, 'rgba(0,0,0,0.65)');
    this.contents.fontSize = 18;
    this.changeTextColor(ColorManager.normalColor());
    this.drawText("⋮", btnX, btnY + 1, btnW, 'center');

    // Message content — keep right margin clear of the button
    const contentWidth = rect.width - btnW - 20;
    this.contents.fontSize = 16;
    this.changeTextColor(ColorManager.normalColor());
    const wrappedText = this.wrapText(message.content, contentWidth);
    let yOffset = rect.y + 28;

    for (const line of wrappedText) {
        this.drawText(line, rect.x + 12, yOffset, contentWidth);
        yOffset += lineHeight - 8;
    }

    // Reply thread indicator
    if (message.parent_message_id) {
        this.contents.fontSize = 12;
        this.changeTextColor(ColorManager.textColor(14));
        this.drawText("↳ reply", rect.x + 12, rect.y + rect.height - 20, 80);
    }

    this.resetTextColor();
};

Window_ChatMessage.prototype.getMessageColor = function(message) {
    if (message.user_id === AuthManager.getUserId()) {
        return 0x1a4d1a; // Green-tinted for own messages
    }
    return 0x1a1a2e; // Dark blue-ish for other messages
};

Window_ChatMessage.prototype.wrapText = function(text, maxWidth) {
    const lines = [];
    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const width = this.textWidth(testLine);

        if (width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
};

Window_ChatMessage.prototype.formatTime = function(isoString) {
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) {
            return "Just now";
        } else if (diffMins < 60) {
            return diffMins + "m ago";
        } else if (diffMins < 1440) {
            const hours = Math.floor(diffMins / 60);
            return hours + "h ago";
        } else {
            return date.toLocaleDateString();
        }
    } catch (e) {
        return "";
    }
};

// Block keyboard OK (Enter/Z) so it never opens the action menu —
// Enter is handled by the DOM keydown listener in Window_ChatInput instead.
Window_ChatMessage.prototype.isOkTriggered = function() {
    return false;
};

// Single-click opens the action menu instead of requiring a double-click.
Window_ChatMessage.prototype.onTouchSelect = function(trigger) {
    if (!this.isCursorMovable()) return;
    const index = this.hitTest(TouchInput.x, TouchInput.y);
    if (index >= 0) {
        this.select(index);
        if (trigger) this.processOk();
    }
};

Window_ChatMessage.prototype.processCancel = function() {
    // Escape is handled at the scene level (popScene). Nothing to do here.
};

Window_ChatMessage.prototype.refresh = function() {
    this.createContents();
    this.drawAllItems();
};
