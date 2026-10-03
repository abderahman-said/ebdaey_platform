/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Container, Head, Heading, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import { alignFor, dirFor, fontFor, logoFor, type EmailLang } from './locale.ts'

interface ReauthenticationEmailProps {
  token: string
  language?: EmailLang
}

export const ReauthenticationEmail = ({ token, language = 'ar' }: ReauthenticationEmailProps) => {
  const en = language === 'en'
  return (
    <Html lang={language} dir={dirFor(language)}>
      <Head />
      <Preview>{en ? 'Your verification code' : 'رمز التحقق الخاص بك'}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: fontFor(language) }}>
        <Container style={{ padding: '30px 25px', textAlign: alignFor(language) }}>
          <Img src={logoFor(language)} alt="ebdaey" width="120" height="40" style={{ margin: '0 0 24px 0' }} />
          <Heading style={h1}>{en ? 'Confirm your identity' : 'تأكيد الهوية'}</Heading>
          <Text style={text}>{en ? 'Use the code below to confirm your identity:' : 'استخدم الرمز أدناه لتأكيد هويتك:'}</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>{en ? 'This code will expire soon. If you did not request this, you can safely ignore this email.' : 'سينتهي هذا الرمز قريباً. إذا لم تطلب هذا، يمكنك تجاهل هذا البريد بأمان.'}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ReauthenticationEmail

const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e2229', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#6e7787', lineHeight: '1.7', margin: '0 0 20px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#1e2229', margin: '0 0 30px', letterSpacing: '4px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
