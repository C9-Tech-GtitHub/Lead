import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain, leadId } = await request.json();

    if (!domain) {
      return NextResponse.json({ error: 'Missing domain' }, { status: 400 });
    }

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    const apiKey = process.env.TOMBA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Tomba API key not configured' },
        { status: 500 }
      );
    }

    // Call Tomba.io Domain Search API
    const tombaUrl = `https://api.tomba.io/v1/domain-search?domain=${encodeURIComponent(domain)}`;

    const response = await fetch(tombaUrl, {
      headers: {
        'X-Tomba-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Tomba API rate limit reached. Please try again later.' },
          { status: 429 }
        );
      }

      const errorData = await response.json().catch(() => ({}));
      console.error('Tomba API error:', errorData);

      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to fetch emails from Tomba' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Save emails to Supabase
    try {
      // Update lead with Tomba.io metadata
      await supabase
        .from('leads')
        .update({
          tomba_searched_at: new Date().toISOString(),
          tomba_organization: data.data.organization,
          tomba_email_pattern: data.data.pattern,
          tomba_total_emails: data.meta.total,
        })
        .eq('id', leadId);

      // Delete existing Tomba emails for this lead (to avoid duplicates on re-search)
      await supabase.from('lead_emails').delete().eq('lead_id', leadId).eq('provider', 'tomba');

      // Insert new emails
      const emails = data.data.emails || [];
      if (emails.length > 0) {
        const emailRecords = emails.map((email: any) => ({
          lead_id: leadId,
          user_id: user.id,
          email: email.email,
          type: email.type === 'generic' ? 'generic' : 'personal',
          confidence: email.score || 0,
          first_name: email.first_name,
          last_name: email.last_name,
          position: email.position,
          department: email.department,
          seniority: email.seniority,
          verification_status: email.verification?.status || 'unknown',
          verification_date: email.verification?.date || null,
          sources: email.sources || [],
          provider: 'tomba',
        }));

        const { error: insertError } = await supabase
          .from('lead_emails')
          .insert(emailRecords);

        if (insertError) {
          console.error('Error saving emails to database:', insertError);
          // Don't fail the request, just log the error
        }
      }
    } catch (dbError) {
      console.error('Error saving to database:', dbError);
      // Continue anyway - we'll still return the data
    }

    // Return the email data
    return NextResponse.json({
      success: true,
      data: {
        domain: data.data.domain,
        organization: data.data.organization,
        pattern: data.data.pattern,
        emails: data.data.emails || [],
        totalResults: data.meta.total,
      },
    });
  } catch (error) {
    console.error('Error fetching emails from Tomba:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
