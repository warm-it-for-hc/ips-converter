import React from "react"
import { Link } from "react-router-dom"
import { QrCode } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const Home: React.FC = () => {
  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth">
      {/* Section 1: Hero / Intro */}
      <section
        id="intro"
        className="h-screen snap-start flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 md:px-12"
      >
        <div className="max-w-3xl text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800">International Patient Summary (IPS)</h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            IPS is a <span className="font-semibold">standardized summary of a patient's health data</span> based on
            <a
              href="https://www.hl7.org/fhir/uv/ips/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-600 hover:text-blue-800 ml-1"
            >
              HL7® FHIR® IPS Implementation Guide
            </a>.
          </p>
          <p className="text-slate-500 text-base">
            This platform lets you easily convert and share IPS records via QR codes.
          </p>
          <div className="pt-4">
            <span className="text-sm text-slate-400">Scroll down to learn more ↓</span>
          </div>
        </div>
      </section>

      {/* Section 2: Basic IPS Info */}
      <section
        id="info"
        className="h-screen snap-start flex items-center justify-center bg-gradient-to-br from-white to-slate-200 px-6 md:px-12"
      >
        <div className="max-w-4xl space-y-6 text-center md:text-left">
          <h2 className="text-3xl font-semibold text-slate-800">What is in an IPS?</h2>
          <p className="text-slate-700 text-lg">
            An International Patient Summary typically includes:
          </p>
          <ul className="list-disc list-inside text-slate-600 text-base space-y-1">
            <li>Patient identification and demographics</li>
            <li>Medical history and conditions</li>
            <li>Allergies and intolerances</li>
            <li>Medications and immunizations</li>
            <li>Vital signs and test results</li>
          </ul>
          <p className="text-slate-500">
            The IPS format promotes safe, consistent data exchange across systems and borders.
          </p>
        </div>
      </section>

      {/* Section 3: QR Actions */}
      <section
        id="qr"
        className="h-screen snap-start flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 px-6 md:px-12"
      >
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl">
          {/* Upload */}
          <Card className="flex-1 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <QrCode className="h-5 w-5 text-blue-600" />
                Create QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">
                Upload a FHIR-based JSON to generate a QR code for easy sharing.
              </p>
              <Button asChild className="bg-blue-100 text-blue-700 hover:bg-blue-500 hover:text-white transition-colors duration-200">
                <Link to="/upload">Go to Upload</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Scan */}
          <Card className="flex-1 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <QrCode className="h-5 w-5 text-green-600" />
                Scan QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">
                Scan a QR code to view a shared IPS document from another user.
              </p>
              <Button asChild className="bg-green-100 text-green-700 hover:bg-green-500 hover:text-white transition-colors duration-200">
                <Link to="/share">Go to Share</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 4: Footer */}
      <section
        id="footer"
        className="h-screen snap-start flex items-center justify-center bg-slate-800 text-slate-200 px-6 py-8"
      >
        <div className="max-w-4xl text-center space-y-6">
          <h2 className="text-2xl font-semibold">Contact & Info</h2>

          <p className="text-slate-400 text-base">
            If you have questions or suggestions about this FHIR IPS tool,
            feel free to reach out!
          </p>

          <div className="space-y-2">
            <p className="text-sm">
              <a href="mailto:ohshane71@gmail.com" className="text-slate-400 hover:text-white">Email</a>
            </p>
            <p className="text-sm">
              <a href="https://github.com/warm-it-for-hc/ips-converter" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">GitHub</a>
            </p>
          </div>

          <div className="text-xs text-slate-500">
            <p className="m-2">
              &copy; {new Date().getFullYear()} IPS Portal. All rights reserved.
            </p>
            <p className="m-2">
               This work is a research project by WITH Lab.
            </p>
            <p className="m-2">
              Built with energy by Jisan &middot;
              with passion by Byeongu &middot;
              with clarity by Gyuryeon &middot;
              with &hearts; by Shane.
            </p>
          </div>

        </div>
      </section>
    </div>
  )
}

export default Home