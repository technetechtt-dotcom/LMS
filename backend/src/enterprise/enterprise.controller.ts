import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * Enterprise-scale roadmap surface (P2).
 * Endpoints advertise capability status without fake implementations.
 */
@ApiTags('Enterprise roadmap')
@Controller('enterprise')
export class EnterpriseController {
  @Public()
  @Get('capabilities')
  capabilities() {
    return {
      product:
        'Digital Skills Development, Assessment and Compliance Operating System',
      live: [
        'programme-management',
        'learner-administration',
        'attendance',
        'workplace-learning',
        'poe',
        'assessment',
        'assessor-workflow',
        'moderation',
        'compliance-export',
        'credentials',
        'audit',
        'invitations',
        'privacy-dsar',
      ],
      planned: {
        mfaTotp: 'live',
        webauthn: 'planned',
        saml: 'planned',
        oidc: 'planned',
        corporateSso: 'planned',
        tenantBilling: 'planned',
        employerPortal: 'planned',
        mentorPortal: 'planned',
        configurableQualificationEngine: 'partial',
        bulkLearnerOnboarding: 'planned',
        documentTemplates: 'planned',
        digitalSignatures: 'planned',
        scorm: 'planned',
        xapi: 'planned',
        lti: 'planned',
        webhooks: 'planned',
        offlineAssessmentSync: 'planned',
        advancedAnalytics: 'planned',
        learnerRiskPredictions: 'planned',
        complianceReminders: 'planned',
        accreditationExpiryMonitoring: 'planned',
      },
    };
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'PLATFORM_ADMIN')
  @Get('billing/status')
  billingStatus() {
    return {
      enabled: false,
      message: 'Tenant subscription/billing is not enabled in this release',
    };
  }

  @Public()
  @Get('integrations')
  integrations() {
    return {
      scorm: false,
      xapi: false,
      lti: false,
      webhooks: false,
      message: 'Learning-standard integrations are on the enterprise roadmap',
    };
  }
}
