const express = require('express');
const bodyParser = require('body-parser');
const GhostOAuthService = require('../../services/auth/oauth-service');

/**
 * OAuth Router for Ghost Members
 * This is a modular OAuth implementation that can be mounted in the members app
 */
module.exports = function createOAuthRouter(membersService) {
    const router = express.Router();
    const oauthService = new GhostOAuthService();
    
    // Initiate OAuth flow (supports both GET for links and POST for forms)
    router.get('/:provider/init', (req, res) => {
        try {
            const { provider } = req.params;
            const { handle } = req.query;
            
            const authUrl = oauthService.getOAuthUrl(provider, handle);
            res.redirect(authUrl);
        } catch (error) {
            console.error('OAuth init error:', error);
            res.redirect('/signin?error=oauth_init_failed');
        }
    });
    
    router.post('/:provider/init', bodyParser.urlencoded({ extended: true }), (req, res) => {
        try {
            const { provider } = req.params;
            const { handle } = req.body;
            
            const authUrl = oauthService.getOAuthUrl(provider, handle);
            res.redirect(authUrl);
        } catch (error) {
            console.error('OAuth init error:', error);
            res.redirect('/signin?error=oauth_init_failed');
        }
    });
    
    // OAuth callback from bridge service
    router.get('/callback', async (req, res) => {
        try {
            const { token, provider } = req.query;
            
            if (!token || !provider) {
                throw new Error('Missing OAuth callback parameters');
            }
            
            // Verify token from bridge
            const oauthData = oauthService.verifyBridgeToken(token);
            
            // Create or update Ghost member
            const result = await oauthService.createOrUpdateMember(
                oauthData,
                membersService.api
            );
            
            if (result.needsEmail) {
                // Redirect to email collection page
                res.redirect(`/oauth-welcome?token=${encodeURIComponent(token)}`);
            } else {
                // Create session and redirect to home
                const sessionToken = oauthService.createSessionToken(result.member, oauthData);
                
                // Set cookie and redirect
                res.cookie('ghost-members-ssr', sessionToken, {
                    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                    httpOnly: true,
                    sameSite: 'lax'
                });
                
                res.redirect('/');
            }
        } catch (error) {
            console.error('OAuth callback error:', error);
            res.redirect('/signin?error=oauth_failed');
        }
    });
    
    // Complete profile for ATProto users (add email)
    router.post('/complete-profile', bodyParser.urlencoded({ extended: true }), async (req, res) => {
        try {
            const { token, email, subscribe } = req.body;
            
            if (!token) {
                throw new Error('Missing token');
            }
            
            if (email) {
                await oauthService.completeProfile(token, email, subscribe === 'on', membersService.api);
            }
            
            // Create session with or without email
            const oauthData = oauthService.verifyBridgeToken(token);
            const tempEmail = oauthData.email || `${oauthData.did.replace(/:/g, '_')}@atproto.local`;
            
            const existingMembers = await membersService.api.members.browse({
                filter: `email:${tempEmail}`
            });
            
            if (existingMembers && existingMembers.length > 0) {
                const member = existingMembers[0];
                const sessionToken = oauthService.createSessionToken(member, oauthData);
                
                res.cookie('ghost-members-ssr', sessionToken, {
                    maxAge: 30 * 24 * 60 * 60 * 1000,
                    httpOnly: true,
                    sameSite: 'lax'
                });
            }
            
            res.redirect('/');
        } catch (error) {
            console.error('Profile completion error:', error);
            res.redirect('/signin?error=profile_failed');
        }
    });
    
    return router;
};
