import { describe, it, expect } from 'vitest'
import { organisationCreateSchema } from '../../src/lib/validation'

describe('Add Organisation Form Validation Schema', () => {
  it('rejects payload with missing required fields', () => {
    const result = organisationCreateSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      expect(errors.name).toBeDefined()
      expect(errors.domain).toBeDefined()
      expect(errors.leadSource).toBeDefined()
    }
  })

  it('rejects organisation name shorter than 2 characters', () => {
    const result = organisationCreateSchema.safeParse({
      name: 'A',
      domain: 'Mental Health',
      leadSource: 'LinkedIn',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined()
    }
  })

  it('accepts valid payload without category (only domain and organisationType)', () => {
    const result = organisationCreateSchema.safeParse({
      name: 'Leadwise Care Clinic',
      domain: 'Mental Health',
      leadSource: 'LinkedIn',
      organisationType: 'Private Organization',
      numberOfProfessionals: 42,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Leadwise Care Clinic')
      expect(result.data.domain).toBe('Mental Health')
      expect(result.data.organisationType).toBe('Private Organization')
      expect(result.data.numberOfProfessionals).toBe(42)
      expect(result.data.category).toBeUndefined()
    }
  })

  it('handles optional numberOfProfessionals (accepts undefined, 0, or string coerced)', () => {
    const emptyResult = organisationCreateSchema.safeParse({
      name: 'Solo Wellness Hub',
      domain: 'Physical Health',
      leadSource: 'Website',
      numberOfProfessionals: '',
    })
    expect(emptyResult.success).toBe(true)
    if (emptyResult.success) {
      expect(emptyResult.data.numberOfProfessionals).toBeUndefined()
    }

    const zeroResult = organisationCreateSchema.safeParse({
      name: 'Early Stage Project',
      domain: 'Physical Health',
      leadSource: 'Website',
      numberOfProfessionals: 0,
    })
    expect(zeroResult.success).toBe(true)
    if (zeroResult.success) {
      expect(zeroResult.data.numberOfProfessionals).toBe(0)
    }

    const negativeResult = organisationCreateSchema.safeParse({
      name: 'Invalid Team Size Org',
      domain: 'Physical Health',
      leadSource: 'Website',
      numberOfProfessionals: -3,
    })
    expect(negativeResult.success).toBe(false)
  })

  it('accepts complete valid payload without contact (contacts are optional)', () => {
    const result = organisationCreateSchema.safeParse({
      name: 'Sentio Mind Wellness',
      category: 'Healthcare',
      domain: 'Mental Health',
      leadSource: 'LinkedIn',
      website: 'https://sentiomind.com',
      organisationType: 'Private Organization',
      priority: 'HIGH',
      status: 'NEW',
      notes: 'Initial outreach notes here',
      tags: ['High Potential', 'Healthcare'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Sentio Mind Wellness')
      expect(result.data.domain).toBe('Mental Health')
      expect(result.data.leadSource).toBe('LinkedIn')
      expect(result.data.website).toBe('https://sentiomind.com')
      expect(result.data.tags).toEqual(['High Potential', 'Healthcare'])
    }
  })

  it('accepts custom category, custom domain, and custom lead source strings', () => {
    const result = organisationCreateSchema.safeParse({
      name: 'Mindful Horizons Center',
      category: 'Holistic Pediatric Care',
      domain: 'Pediatric Neurodivergence',
      leadSource: 'Podcast Guesting',
      organisationType: 'Private Clinic',
      tags: ['Local', 'Decision Maker'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBe('Holistic Pediatric Care')
      expect(result.data.domain).toBe('Pediatric Neurodivergence')
      expect(result.data.leadSource).toBe('Podcast Guesting')
      expect(result.data.organisationType).toBe('Private Clinic')
    }
  })

  it('validates optional primary contact fields when provided', () => {
    const validWithContact = organisationCreateSchema.safeParse({
      name: 'Lotus Rehab Care',
      category: 'Rehabilitation & Recovery',
      domain: 'Addiction Recovery',
      leadSource: 'Cold Research',
      primaryContact: {
        name: 'Dr. Sarah Smith',
        designation: 'Clinical Director',
        email: 'sarah.smith@lotusrehab.com',
        phone: '+91 9876543210',
        linkedinUrl: 'https://linkedin.com/in/drsarahsmith',
        isDecisionMaker: true,
        priority: 'HIGH',
      },
    })
    expect(validWithContact.success).toBe(true)
    if (validWithContact.success) {
      expect(validWithContact.data.primaryContact?.name).toBe('Dr. Sarah Smith')
      expect(validWithContact.data.primaryContact?.isDecisionMaker).toBe(true)
    }

    const invalidEmailContact = organisationCreateSchema.safeParse({
      name: 'Lotus Rehab Care',
      category: 'Rehabilitation & Recovery',
      domain: 'Addiction Recovery',
      leadSource: 'Cold Research',
      primaryContact: {
        name: 'Dr. Sarah Smith',
        email: 'not-an-email',
      },
    })
    expect(invalidEmailContact.success).toBe(false)
  })

  it('rejects invalid website URLs', () => {
    const result = organisationCreateSchema.safeParse({
      name: 'Lotus Rehab Care',
      category: 'Rehabilitation & Recovery',
      domain: 'Addiction Recovery',
      leadSource: 'Cold Research',
      website: 'invalid://not a domain',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.website).toBeDefined()
    }
  })
})
