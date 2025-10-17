import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateLinkedInCompanyIdCandidates } from '@/lib/utils/linkedin-helpers';

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

    const { linkedinCompanyId, leadId, companyName, website, autoDetect } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    // Generate candidate IDs if auto-detecting
    let candidateIds: string[] = [];
    if (autoDetect && companyName) {
      candidateIds = generateLinkedInCompanyIdCandidates(companyName, website);
    } else if (linkedinCompanyId) {
      candidateIds = [linkedinCompanyId];
    } else {
      return NextResponse.json(
        { error: 'Missing linkedinCompanyId or companyName for auto-detection' },
        { status: 400 }
      );
    }

    const apiKey = process.env.SCRAPINGDOG_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ScrapingDog API key not configured' },
        { status: 500 }
      );
    }

    // Try each candidate ID until one works
    let data: any = null;
    let successfulId: string | null = null;
    let lastError: string = '';

    for (const candidateId of candidateIds) {
      console.log('Trying LinkedIn company ID:', candidateId);

      const scrapingDogUrl = `https://api.scrapingdog.com/profile/?api_key=${apiKey}&type=company&id=${encodeURIComponent(candidateId)}`;

      try {
        const response = await fetch(scrapingDogUrl);

        if (response.ok) {
          data = await response.json();

          // Verify we got valid company data
          if (data && (data.name || data.company_name)) {
            successfulId = candidateId;
            console.log('Successfully found company with ID:', candidateId);
            break;
          }
        } else if (response.status === 429) {
          return NextResponse.json(
            {
              error: 'ScrapingDog API rate limit reached. Please try again later.',
            },
            { status: 429 }
          );
        } else {
          lastError = `Failed with ${candidateId}: ${response.status}`;
        }
      } catch (err) {
        lastError = `Error with ${candidateId}: ${err}`;
        console.error(lastError);
      }
    }

    // If no candidate worked, return error
    if (!data || !successfulId) {
      return NextResponse.json(
        {
          error: `Could not find LinkedIn company. Tried: ${candidateIds.join(', ')}`,
          triedIds: candidateIds,
          lastError
        },
        { status: 404 }
      );
    }

    // Save company data to database
    try {
      const companyUrl = `https://www.linkedin.com/company/${successfulId}`;

      // Update lead with LinkedIn company data
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          linkedin_company_url: companyUrl,
          linkedin_company_id: successfulId,
          linkedin_scraped_at: new Date().toISOString(),
          linkedin_company_data: data,
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Error updating lead with LinkedIn data:', updateError);
      }

      // Extract and save key people if available
      const employees = data.employees || data.people || [];
      if (employees.length > 0) {
        // Delete existing people for this lead
        await supabase
          .from('lead_linkedin_people')
          .delete()
          .eq('lead_id', leadId);

        // Insert new people
        const peopleRecords = employees
          .slice(0, 50) // Limit to 50 people
          .map((person: any) => ({
            lead_id: leadId,
            user_id: user.id,
            linkedin_profile_id: person.id || person.profile_id,
            linkedin_profile_url: person.url || person.profile_url,
            full_name: person.name || person.full_name,
            headline: person.headline || person.title,
            position: person.position || person.current_position,
            profile_image_url: person.image || person.profile_image,
            email: person.email,
            profile_data: person,
          }));

        if (peopleRecords.length > 0) {
          const { error: peopleError } = await supabase
            .from('lead_linkedin_people')
            .insert(peopleRecords);

          if (peopleError) {
            console.error('Error saving LinkedIn people:', peopleError);
          }
        }
      }
    } catch (dbError) {
      console.error('Error saving to database:', dbError);
      // Continue anyway - we'll still return the data
    }

    // Return formatted data
    return NextResponse.json({
      success: true,
      foundCompanyId: successfulId,
      triedIds: candidateIds,
      data: {
        company: {
          name: data.name || data.company_name,
          description: data.description || data.about,
          industry: data.industry,
          companySize: data.company_size || data.size,
          website: data.website,
          headquarters: data.headquarters || data.location,
          founded: data.founded || data.founded_year,
          specialties: data.specialties || [],
          followerCount: data.follower_count || data.followers,
        },
        employees: (data.employees || data.people || []).map((person: any) => ({
          id: person.id || person.profile_id,
          name: person.name || person.full_name,
          position: person.position || person.current_position,
          headline: person.headline || person.title,
          profileUrl: person.url || person.profile_url,
          imageUrl: person.image || person.profile_image,
          email: person.email,
        })),
        totalEmployees: data.employee_count || data.total_employees,
      },
    });
  } catch (error) {
    console.error('Error scraping LinkedIn company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
