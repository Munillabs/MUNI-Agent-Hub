/* MUNI AI Hub 웹 파트
   SharePoint 페이지에 Hub를 그리고, 웹 파트 설정 창에서 목록이 있는 사이트와 목록 이름 등을 바꿀 수 있게 합니다. */
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration, PropertyPaneTextField, PropertyPaneToggle } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { SPComponentLoader } from '@microsoft/sp-loader';
import * as strings from 'MuniAgentHubWebPartStrings';

import MuniAgentHub, { IMuniAgentHubProps } from './components/MuniAgentHub';
import { HubService } from './services/HubService';

export interface IMuniAgentHubWebPartProps {
  siteUrl: string;
  agentsList: string;
  ideasList: string;
  casesList: string;
  skillsList: string;
  htmlsList: string;
  adminEmail: string;
  launchDeskUrl: string;
  showHeader: boolean;
  logoUrl: string;
  loadBrandFonts: boolean;
}

export default class MuniAgentHubWebPart extends BaseClientSideWebPart<IMuniAgentHubWebPartProps> {
  private service: HubService | undefined;
  private serviceKey: string = '';

  protected onInit(): Promise<void> {
    if (this.properties.loadBrandFonts !== false) {
      // Pretendard (시안과 같은 글꼴, SIL OFL). 회사 정책으로 jsDelivr가 막혀 있으면 맑은 고딕 등 기본 글꼴로 표시됩니다.
      try {
        SPComponentLoader.loadCss('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
      } catch (e) { /* 글꼴 없이 계속 */ }
    }
    return super.onInit();
  }

  private getService(): HubService {
    const site = (this.properties.siteUrl || '').trim() || this.context.pageContext.web.absoluteUrl;
    const lists = {
      agents: this.properties.agentsList || 'Agent Catalog',
      ideas: this.properties.ideasList || 'Idea Board',
      cases: this.properties.casesList || 'Case Library',
      skills: this.properties.skillsList || 'Skill Library',
      htmls: this.properties.htmlsList || 'HTML Library'
    };
    const key = [site, lists.agents, lists.ideas, lists.cases, lists.skills, lists.htmls].join('|');
    if (!this.service || key !== this.serviceKey) {
      this.service = new HubService(this.context.spHttpClient, site, lists);
      this.serviceKey = key;
    }
    return this.service;
  }

  public render(): void {
    const props: IMuniAgentHubProps = {
      service: this.getService(),
      siteUrl: (this.properties.siteUrl || '').trim() || this.context.pageContext.web.absoluteUrl,
      showHeader: this.properties.showHeader !== false,
      logoUrl: (this.properties.logoUrl || '').trim(),
      adminEmail: (this.properties.adminEmail || '').trim(),
      launchDeskUrl: (this.properties.launchDeskUrl || '').trim()
    };
    ReactDom.render(React.createElement(MuniAgentHub, props), this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  // 설정 창에서 글자를 입력할 때마다 다시 그리지 않고 '적용'을 눌렀을 때 반영합니다.
  protected get disableReactivePropertyChanges(): boolean {
    return true;
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [{
        header: { description: strings.PropertyPaneDescription },
        groups: [
          {
            groupName: strings.DataGroupName,
            groupFields: [
              PropertyPaneTextField('siteUrl', { label: strings.SiteUrlLabel, description: strings.SiteUrlDescription, placeholder: 'https://contoso.sharepoint.com/sites/AIHub' }),
              PropertyPaneTextField('agentsList', { label: strings.AgentsListLabel, placeholder: 'Agent Catalog' }),
              PropertyPaneTextField('skillsList', { label: strings.SkillsListLabel, placeholder: 'Skill Library' }),
              PropertyPaneTextField('htmlsList', { label: strings.HtmlsListLabel, placeholder: 'HTML Library' }),
              PropertyPaneTextField('ideasList', { label: strings.IdeasListLabel, placeholder: 'Idea Board' }),
              PropertyPaneTextField('casesList', { label: strings.CasesListLabel, placeholder: 'Case Library' })
            ]
          },
          {
            groupName: strings.LinksGroupName,
            groupFields: [
              PropertyPaneTextField('adminEmail', { label: strings.AdminEmailLabel, description: strings.AdminEmailDescription, placeholder: 'aihub@munilabs.co.kr' }),
              PropertyPaneTextField('launchDeskUrl', { label: strings.LaunchDeskLabel, description: strings.LaunchDeskDescription, placeholder: 'https://teams.microsoft.com/l/app/…' })
            ]
          },
          {
            groupName: strings.DisplayGroupName,
            groupFields: [
              PropertyPaneToggle('showHeader', { label: strings.ShowHeaderLabel, onText: strings.On, offText: strings.Off }),
              PropertyPaneTextField('logoUrl', { label: strings.LogoUrlLabel, description: strings.LogoUrlDescription, placeholder: 'https://munilabskr.sharepoint.com/sites/AIHub/SiteAssets/muni-logo.png' }),
              PropertyPaneToggle('loadBrandFonts', { label: strings.BrandFontsLabel, onText: strings.On, offText: strings.Off })
            ]
          }
        ]
      }]
    };
  }
}
