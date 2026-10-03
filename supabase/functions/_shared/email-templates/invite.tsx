/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import { alignFor, dirFor, fontFor, logoFor, type EmailLang } from './locale.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  language?: EmailLang
}

export const InviteEmail = ({ siteName, confirmationUrl, language = 'ar' }: InviteEmailProps) => {
  const en = language === 'en'
  return (
    <Html lang={language} dir={dirFor(language)}>
      <Head />
      <Preview>{en ? `You've been invited to ${siteName}` : `تمت دعوتك للانضمام إلى ${siteName}`}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: fontFor(language) }}>
        <Container style={{ padding: '30px 25px', textAlign: alignFor(language) }}>
          <Img src={logoFor(language)} alt="ebdaey" width="120" height="40" style={{ margin: '0 0 24px 0' }} />
          <Heading style={h1}>{en ? "You've been invited" : 'تمت دعوتك'}</Heading>
          <Text style={text}>
            {en
              ? <>You've been invited to join <strong>{siteName}</strong>. Click the button below to accept the invite and create your account.</>
              : <>تمت دعوتك للانضمام إلى <strong>{siteName}</strong>. انقر على الزر أدناه لقبول الدعوة وإنشاء حسابك.</>}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {en ? 'Accept invite' : 'قبول الدعوة'}
          </Button>
          <Text style={footer}>
            {en ? "If you weren't expecting this invite, you can safely ignore this email." : 'إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد بأمان.'}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InviteEmail

const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e2229', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#6e7787', lineHeight: '1.7', margin: '0 0 20px' }
const button = { backgroundColor: '#1e2229', color: '#ffffff', fontSize: '15px', borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
