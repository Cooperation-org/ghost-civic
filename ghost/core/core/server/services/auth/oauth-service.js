const jwt = require('jsonwebtoken');
const axios = require('axios');

class GhostOAuthService {
    constructor() {
        this.bridgeUrl = process.env.BRIDGE_URL || 'http://127.0.0.1:5000';
        this.sharedSecret = process.env.SHARED_JWT_SECRET || 'change-in-production';
    }

    /**
     * Initiate OAuth flow by redirecting to bridge service
     */
    getOAuthUrl(provider, handle = null) {
        if (provider === 'google') {
            return `${this.bridgeUrl}/api/auth/google`;
        } else if (provider === 'atproto') {
            if (!handle) {
                throw new Error('Handle required for ATProto OAuth');
            }
            // Bridge will handle the OAuth and redirect back
            return `${this.bridgeUrl}/api/auth/atproto/init?handle=${encodeURIComponent(handle)}&ghost_callback=true`;
        }
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    /**
     * Verify OAuth token from bridge service
     */
    verifyBridgeToken(token) {
        try {
            return jwt.verify(token, this.sharedSecret);
        } catch (error) {
            throw new Error('Invalid OAuth token');
        }
    }

    /**
     * Create or update Ghost member from OAuth data
     */
    async createOrUpdateMember(oauthData, membersApi) {
        // For ATProto users without email, create a unique identifier
        const email = oauthData.email || `${oauthData.did.replace(/:/g, '_')}@atproto.local`;
        
        try {
            // Check if member exists
            const existingMembers = await membersApi.members.browse({
                filter: `email:${email}`
            });

            let member;
            if (existingMembers && existingMembers.length > 0) {
                member = existingMembers[0];
                // Update member data
                member = await membersApi.members.edit({
                    id: member.id,
                    name: oauthData.name || oauthData.handle || member.name,
                    note: `OAuth user - ${oauthData.provider}`,
                    labels: member.labels || []
                });
            } else {
                // Create new member
                member = await membersApi.members.create({
                    email,
                    name: oauthData.name || oauthData.handle,
                    note: `OAuth user - ${oauthData.provider}`,
                    labels: [{name: `oauth-${oauthData.provider}`}],
                    subscribed: !!oauthData.email // Only subscribe if they have a real email
                });
            }

            return {
                member,
                needsEmail: !oauthData.email && oauthData.provider === 'atproto'
            };
        } catch (error) {
            console.error('Failed to create/update member:', error);
            throw error;
        }
    }

    /**
     * Complete profile for ATProto users who provide email
     */
    async completeProfile(token, email, subscribe, membersApi) {
        const oauthData = this.verifyBridgeToken(token);
        
        if (!oauthData.did) {
            throw new Error('Invalid token for profile completion');
        }

        // Find the temporary member
        const tempEmail = `${oauthData.did.replace(/:/g, '_')}@atproto.local`;
        const existingMembers = await membersApi.members.browse({
            filter: `email:${tempEmail}`
        });

        if (!existingMembers || existingMembers.length === 0) {
            throw new Error('Member not found');
        }

        const member = existingMembers[0];

        // Update with real email
        return await membersApi.members.edit({
            id: member.id,
            email: email,
            subscribed: subscribe
        });
    }

    /**
     * Create a session token that can be verified by both Ghost and Bridge
     */
    createSessionToken(member, oauthData) {
        return jwt.sign({
            memberId: member.id,
            email: member.email,
            name: member.name,
            did: oauthData.did,
            handle: oauthData.handle,
            provider: oauthData.provider
        }, this.sharedSecret, { expiresIn: '30d' });
    }
}

module.exports = GhostOAuthService;
