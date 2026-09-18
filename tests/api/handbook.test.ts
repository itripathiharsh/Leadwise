import { describe, it, expect, beforeAll } from 'vitest'
import { can, assertCan, ForbiddenError } from '../../src/lib/rbac'
import { INITIAL_HANDBOOK_SEED } from '../../src/server/services/handbook/seed-data'
import {
  getHandbook,
  updateHandbookMetadata,
  createSection,
  updateSection,
  reorderSections,
  publishHandbook,
  discardDraft,
  deleteSection,
  HANDBOOK_SLUG,
} from '../../src/server/services/handbook/handbook'
import type { CurrentUser } from '../../src/lib/auth/current-user'

describe('Sentio Mind Organisation Handbook CMS Contracts & RBAC', () => {
  const mockOwner: CurrentUser = {
    id: 'user_owner_001',
    name: 'Admin Owner',
    email: 'admin@sentio.in',
    role: 'OWNER',
    status: 'APPROVED',
    phone: null,
    avatarColor: 'violet',
    isActive: true,
  }

  const mockTL: CurrentUser = {
    id: 'user_tl_002',
    name: 'Harsh Lead',
    email: 'harsh@sentio.in',
    role: 'TL',
    status: 'APPROVED',
    phone: null,
    avatarColor: 'teal',
    isActive: true,
  }

  const mockIntern: CurrentUser = {
    id: 'user_intern_003',
    name: 'Intern Member',
    email: 'intern@sentio.in',
    role: 'INTERN',
    status: 'APPROVED',
    phone: null,
    avatarColor: 'slate',
    isActive: true,
  }

  describe('RBAC Permission Matrix Enforcement', () => {
    it('allows all roles (OWNER, TL, INTERN) to view the handbook', () => {
      expect(can(mockOwner, 'handbook:view')).toBe(true)
      expect(can(mockTL, 'handbook:view')).toBe(true)
      expect(can(mockIntern, 'handbook:view')).toBe(true)
    })

    it('grants handbook:manage exclusively to OWNER and TL', () => {
      expect(can(mockOwner, 'handbook:manage')).toBe(true)
      expect(can(mockTL, 'handbook:manage')).toBe(true)
      expect(can(mockIntern, 'handbook:manage')).toBe(false)
    })

    it('throws ForbiddenError when an INTERN attempts to mutate handbook', () => {
      expect(() => assertCan(mockIntern, 'handbook:manage')).toThrow(ForbiddenError)
    })

    it('does not throw when OWNER or TL asserts handbook:manage', () => {
      expect(() => assertCan(mockOwner, 'handbook:manage')).not.toThrow()
      expect(() => assertCan(mockTL, 'handbook:manage')).not.toThrow()
    })
  })

  describe('Seed Content Integrity & Completeness', () => {
    it('contains all 14 core Sentio Mind sections', () => {
      expect(INITIAL_HANDBOOK_SEED.sections).toHaveLength(14)
    })

    it('includes verified Hero identity with safety boundaries and no fabricated claims', () => {
      const hero = INITIAL_HANDBOOK_SEED.sections.find((s) => s.sectionType === 'hero')
      expect(hero).toBeDefined()
      expect(hero?.title).toBe('Sentio Mind')
      expect(hero?.data?.whatWeAre).toBeDefined()
      expect(hero?.data?.whatWeAreNot).toBeDefined()
      expect(hero?.data?.whatWeAreNot).toContain(
        'Not a replacement for doctors, clinical psychologists, or licensed counsellors.',
      )
    })

    it('includes Mission and Vision statements without hyperbole', () => {
      const mv = INITIAL_HANDBOOK_SEED.sections.find((s) => s.sectionType === 'mission_vision')
      expect(mv).toBeDefined()
      expect(mv?.data?.mission?.statement).toContain('human-centred AI experiences')
      expect(mv?.data?.vision?.statement).toBe(
        'A world where self-awareness is an integral part of everyday life.',
      )
    })

    it('includes the 8 product ecosystem modules', () => {
      const eco = INITIAL_HANDBOOK_SEED.sections.find((s) => s.sectionType === 'ecosystem')
      expect(eco).toBeDefined()
      const keys = eco?.data?.items.map((i: any) => i.key)
      expect(keys).toContain('senti')
      expect(keys).toContain('saga')
      expect(keys).toContain('aura')
      expect(keys).toContain('rituals')
      expect(keys).toContain('goals')
      expect(keys).toContain('assessments')
      expect(keys).toContain('counsellors')
      expect(keys).toContain('media')
    })

    it('includes the 10 wellbeing domains', () => {
      const dom = INITIAL_HANDBOOK_SEED.sections.find((s) => s.sectionType === 'domains')
      expect(dom?.data?.items).toHaveLength(10)
    })

    it('includes the 10 foundational principles', () => {
      const prin = INITIAL_HANDBOOK_SEED.sections.find((s) => s.sectionType === 'principles')
      expect(prin?.data?.items).toHaveLength(10)
      expect(prin?.data?.items[0].title).toBe('Human-First, Always')
    })

    it('articulates AI and Humans thesis and boundary', () => {
      const aih = INITIAL_HANDBOOK_SEED.sections.find((s) => s.sectionType === 'ai_humans')
      expect(aih?.data?.thesis).toBe('AI can assist. Humans understand, care, and connect.')
      expect(aih?.data?.aiAssists.length).toBeGreaterThan(0)
      expect(aih?.data?.humansProvide.length).toBeGreaterThan(0)
    })
  })

  describe('Database Service & CMS Lifecycle', () => {
    it('initializes handbook and retrieves visible sections in read mode', async () => {
      const result = await getHandbook(mockIntern, 'read')
      expect(result.handbook).toBeDefined()
      expect(result.handbook.slug).toBe(HANDBOOK_SLUG)
      expect(result.canManage).toBe(false)
      expect(result.sections.length).toBeGreaterThan(0)
    })

    it('allows TL to update handbook metadata', async () => {
      const updated = await updateHandbookMetadata(mockTL, {
        subtitle: 'Updated Test Subtitle for Verification',
      })
      expect(updated.subtitle).toBe('Updated Test Subtitle for Verification')
    })

    it('allows TL to create a new custom section', async () => {
      const newSec = await createSection(mockTL, {
        sectionType: 'rich_text',
        title: 'Vitest Custom Protocol Section',
        content: 'Testing custom handbook addition',
        isVisible: true,
      })
      expect(newSec).toBeDefined()
      expect(newSec.title).toBe('Vitest Custom Protocol Section')

      // Save a draft edit on this section
      const draftSec = await updateSection(mockTL, newSec.id, {
        title: 'Vitest Draft Modified Title',
        saveAsDraft: true,
      })
      expect(draftSec.isDraft).toBe(true)
      expect(draftSec.draftTitle).toBe('Vitest Draft Modified Title')
      expect(draftSec.title).toBe('Vitest Custom Protocol Section')

      // Publishing promotes draft to live
      const publishResult = await publishHandbook(mockTL, 'Vitest publication')
      expect(publishResult.handbook.status).toBe('PUBLISHED')

      // Clean up test section
      await deleteSection(mockTL, newSec.id)
    })

    it('rejects INTERN from updating section', async () => {
      await expect(
        updateSection(mockIntern, 'non_existent_id', {
          title: 'Unauthorized Edit',
        }),
      ).rejects.toThrow(ForbiddenError)
    })
  })
})
