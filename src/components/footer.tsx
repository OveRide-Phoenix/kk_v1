"use client"

import Link from "next/link"
import { Coffee, Phone, Mail, MapPin, Facebook, Instagram, Twitter, ArrowUp } from "lucide-react"
import { Button } from "./ui/button"

/**
 * Footer component with contact information, navigation links, and social media
 */
export default function Footer() {
  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <footer id="contact" className="bg-card border-t relative">
      {/* Scroll to top button */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Button
          onClick={scrollToTop}
          variant="outline"
          size="icon"
          className="rounded-full bg-background shadow-md hover:shadow-lg hover:-translate-y-1 transition-all"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center mb-4">
              <Coffee className="h-6 w-6 text-primary" />
              <span className="ml-2 text-lg font-serif font-bold">Kuteera Kitchen</span>
            </div>
            <p className="text-foreground/70 mb-6">
              Authentic home-cooked meals prepared with love and delivered to your doorstep.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-foreground/70 hover:text-primary transition-colors hover:scale-110 transform duration-300"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-foreground/70 hover:text-primary transition-colors hover:scale-110 transform duration-300"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-foreground/70 hover:text-primary transition-colors hover:scale-110 transform duration-300"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="md:col-span-1">
            <h3 className="text-lg font-medium mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Phone className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <span>+91 9876 543 210</span>
              </li>
              <li className="flex items-start">
                <Mail className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <a href="mailto:info@kuteerakitchen.com" className="hover:text-primary transition-colors">
                  info@kuteerakitchen.com
                </a>
              </li>
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-primary mr-3 mt-0.5" />
                <address className="not-italic">123 Food Street, Jayanagar, Bangalore - 560041</address>
              </li>
            </ul>
          </div>

          <div className="md:col-span-1">
            <h3 className="text-lg font-medium mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#home"
                  className="text-foreground/70 hover:text-primary transition-colors hover:pl-1 duration-300"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="#menu"
                  className="text-foreground/70 hover:text-primary transition-colors hover:pl-1 duration-300"
                >
                  Menu
                </Link>
              </li>
              <li>
                <Link
                  href="#about"
                  className="text-foreground/70 hover:text-primary transition-colors hover:pl-1 duration-300"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="#contact"
                  className="text-foreground/70 hover:text-primary transition-colors hover:pl-1 duration-300"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-foreground/70 hover:text-primary transition-colors hover:pl-1 duration-300"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-foreground/70 hover:text-primary transition-colors hover:pl-1 duration-300"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-1">
            <h3 className="text-lg font-medium mb-4">Opening Hours</h3>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span className="text-foreground/70">Monday - Friday</span>
                <span>8:00 AM - 9:00 PM</span>
              </li>
              <li className="flex justify-between">
                <span className="text-foreground/70">Saturday</span>
                <span>8:00 AM - 10:00 PM</span>
              </li>
              <li className="flex justify-between">
                <span className="text-foreground/70">Sunday</span>
                <span>9:00 AM - 9:00 PM</span>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-secondary rounded-lg w-[350px] -ml-14">
              <h4 className="font-medium mb-2">Subscribe to our newsletter</h4>
              <form className="flex gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-3 py-2 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Email for newsletter"
                />
                <Button type="submit" size="sm" className="px-4">
                  Join
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-foreground/70 text-sm">
            &copy; {new Date().getFullYear()} Kuteera Kitchen. All rights reserved.
          </p>
          <p className="text-foreground/70 text-sm mt-2 md:mt-0">Designed with ❤️ for authentic home-cooked meals</p>
        </div>
      </div>
    </footer>
  )
}

