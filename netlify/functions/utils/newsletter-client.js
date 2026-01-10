// Newsletter subscription management with FaunaDB
const faunadb = require('faunadb');
const q = faunadb.query;

let client = null;

function getClient() {
  if (!client) {
    client = new faunadb.Client({
      secret: process.env.FAUNA_SECRET_KEY,
      domain: 'db.fauna.com',
      scheme: 'https',
    });
  }
  return client;
}

/**
 * Subscribe email to newsletter
 */
async function subscribeToNewsletter(email, name = null, source = 'website') {
  const client = getClient();
  
  try {
    // Check if already subscribed
    const existing = await client.query(
      q.Get(q.Match(q.Index('subscribers_by_email'), email.toLowerCase()))
    ).catch(() => null);
    
    if (existing) {
      // Update existing subscription
      await client.query(
        q.Update(existing.ref, {
          data: {
            isSubscribed: true,
            unsubscribedAt: null,
            resubscribedAt: q.Now(),
            ...(name && { name })
          }
        })
      );
      return { status: 'resubscribed', email };
    }
    
    // Create new subscription
    await client.query(
      q.Create(q.Collection('newsletter_subscribers'), {
        data: {
          email: email.toLowerCase(),
          name,
          source,
          isSubscribed: true,
          subscribedAt: q.Now(),
          unsubscribedAt: null,
        }
      })
    );
    
    return { status: 'subscribed', email };
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    throw error;
  }
}

/**
 * Unsubscribe email from newsletter
 */
async function unsubscribeFromNewsletter(email) {
  const client = getClient();
  
  try {
    const result = await client.query(
      q.Get(q.Match(q.Index('subscribers_by_email'), email.toLowerCase()))
    );
    
    await client.query(
      q.Update(result.ref, {
        data: {
          isSubscribed: false,
          unsubscribedAt: q.Now()
        }
      })
    );
    
    return { status: 'unsubscribed', email };
  } catch (error) {
    if (error.name === 'NotFound') {
      return { status: 'not_found', email };
    }
    console.error('Error unsubscribing from newsletter:', error);
    throw error;
  }
}

/**
 * Get all active subscribers
 */
async function getActiveSubscribers() {
  const client = getClient();
  
  try {
    const result = await client.query(
      q.Map(
        q.Paginate(q.Match(q.Index('subscribers_active'))),
        q.Lambda('ref', q.Get(q.Var('ref')))
      )
    );
    
    return result.data.map(doc => ({
      id: doc.ref.id,
      ...doc.data
    }));
  } catch (error) {
    console.error('Error getting active subscribers:', error);
    throw error;
  }
}

/**
 * Check if email is subscribed
 */
async function isSubscribed(email) {
  const client = getClient();
  
  try {
    const result = await client.query(
      q.Get(q.Match(q.Index('subscribers_by_email'), email.toLowerCase()))
    );
    
    return result.data.isSubscribed === true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

module.exports = {
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getActiveSubscribers,
  isSubscribed,
};
