/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import { alignFor, dirFor, fontFor, logoFor, type EmailLang } from './locale.ts'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  language?: EmailLang
}

export const MagicLinkEmail = ({ siteName, confirmationUrl, language = 'ar' }: MagicLinkEmailProps) => {
  const en = language === 'en'
  return (
    <Html lang={language} dir={dirFor(language)}>
      <Head />
      <Preview>{en ? `Sign in to ${siteName}` : `رابط تسجيل الدخول إلى ${siteName}`}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: fontFor(language) }}>
        <Container style={{ padding: '30px 25px', textAlign: alignFor(language) }}>
          <Img src={logoFor(language)} alt="ebdaey" width="120" height="40" style={{ margin: '0 0 24px 0' }} />
          <Heading style={h1}>{en ? 'Sign-in link' : 'رابط تسجيل الدخول'}</Heading>
          <Text style={text}>
            {en
              ? `Click the button below to sign in to ${siteName}. This link will expire soon.`
              : `انقر على الزر أدناه لتسجيل الدخول إلى ${siteName}. هذا الرابط سينتهي قريباً.`}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {en ? 'Sign in' : 'تسجيل الدخول'}
          </Button>
          <Text style={footer}>
            {en ? 'If you did not request this link, you can safely ignore this email.' : 'إذا لم تطلب هذا الرابط، يمكنك تجاهل هذا البريد بأمان.'}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MagicLinkEmail

const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e2229', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#6e7787', lineHeight: '1.7', margin: '0 0 20px' }
const button = { backgroundColor: '#1e2229', color: '#ffffff', fontSize: '15px', borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
